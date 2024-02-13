import { FastifyInstance } from "fastify"
import {z} from "zod"
import { randomUUID } from "crypto"
import { prisma } from "../../lib/prisma"

const voteOnPoll = async (app: FastifyInstance) => {
  app.post('/polls/:pollId/votes', async (request, replay) => {
    const voteOnPollBody = z.object({
      pollOptionsId: z.string().uuid()
    })

    const voteOnPollParams = z.object({
      pollId: z.string().uuid()
    })

    const { pollOptionsId } = voteOnPollBody.parse(request.body)
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

      if (userPreviousVoteOnPoll) {
        await prisma.vote.delete({
          where: {
            id: userPreviousVoteOnPoll.id
          }
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
        pollOptionsId
      }
    })

    return replay.status(201).send()
  })
}

export default voteOnPoll
