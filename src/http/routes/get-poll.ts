import {z} from "zod"
import { prisma } from "../../lib/prisma"
import { FastifyInstance } from "fastify"

const getPoll = async (app: FastifyInstance) => {
  app.get('/polls/:pollId', async (req, res) => {
    const verifyPoll = z.object({
      pollId: z.string().uuid(),
    })

    const { pollId } = verifyPoll.parse(req.params)


    const poll = await prisma.poll.findUnique({
      where: { id: pollId }, include: {
        options: {
          select: {
            id: true,
            title: true,
          }
        }
      }
    })

    res.status(200).send({poll})
  })
}

export default getPoll;
