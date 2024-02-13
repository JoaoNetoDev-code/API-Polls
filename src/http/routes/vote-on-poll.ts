import { FastifyInstance } from "fastify"
import {z} from "zod"
import { randomUUID } from "crypto"
import { prisma } from "../../lib/prisma"
import { redis } from "../../lib/redis"
import { voting } from "../../utils/Voting-pub-sub"

const voteOnPoll = async (app: FastifyInstance) => {
  app.post('/polls/:pollId/votes', async (request, replay) => {
    const voteOnPollBody = z.object({
      pollOptionId: z.string().uuid()
    })

    const voteOnPollParams = z.object({
      pollId: z.string().uuid()
    })

    const { pollOptionId } = voteOnPollBody.parse(request.body)
    const { pollId } = voteOnPollParams.parse(request.params)

    let { sessionId } = request.cookies

    if (sessionId) {
      const userPreviousVoteOnPoll = await prisma.vote.findUnique({
        where: {
          sessionId_pollId: {
            sessionId,
            pollId
          },
        }
      })

      if (userPreviousVoteOnPoll && userPreviousVoteOnPoll.pollOptionId !== pollOptionId) {
        await prisma.vote.delete({
          where: {
            id: userPreviousVoteOnPoll.id
          }
        })

      const votes = await redis.zincrby(pollId, -1, userPreviousVoteOnPoll.pollOptionId)

      voting.publish(pollId, {
        pollOptionId: userPreviousVoteOnPoll.pollOptionId,
        votes: Number(votes),
      })

      } else if (userPreviousVoteOnPoll) {
        return replay.status(400).send({message: "you already voted on this poll."})
      }
    }

    if (!sessionId) {
    sessionId = randomUUID()

    replay.setCookie("sessionId", sessionId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      signed: true,
      httpOnly: true
    })
    }

    await prisma.vote.create({
      data: {
        sessionId,
        pollId,
        pollOptionId
      }
    })

    const votes = await redis.zincrby(pollId, 1, pollOptionId)

    voting.publish(pollId, {
      pollOptionId,
      votes: Number(votes),
    })

    return replay.status(201).send()
  })
}

export default voteOnPoll
