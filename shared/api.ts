export type Unknown = {
  readonly type: "unknown"
}

export type RequestApi = Unknown | {
  readonly type: "score"
}
export type ResponseApi = Unknown | {
  readonly type: "score",
  readonly score: number
}
