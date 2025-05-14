import type { RequestApi, ResponseApi } from './shared/api'
import { Socket } from './shared/socket'

const url = "ws://127.0.0.1:8080"
const socket = Socket.fromUrl<RequestApi, ResponseApi>(url)

let score = 0
socket.matchRequests((msg) => {
  console.log("Recieved", msg)
  if (msg.type === "score") {
    return {
      type: "score",
      score: score ++
    }
  } else {
    return {
      type: "unknown"
    }
  }
})
