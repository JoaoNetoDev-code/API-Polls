import fastify from "fastify"
import { z } from "zod"
import { PrismaClient } from "@prisma/client"

const app = fastify()

  const { poll } = new PrismaClient()

app.get('/', () => {
  return 'xablau'
})

app.post('/polls', async (request, reply) => {
  const createPollBody = z.object({ title: z.string() })

  const { title } = createPollBody.parse(request.body)

  const newPoll = await poll.create({
    data: {
      title,
    }
  })

  reply.status(201).send({ pollId: newPoll.id })
})

app.listen({ port: 3333 }).then(() => {
  console.log("HTTP server is running!")
})