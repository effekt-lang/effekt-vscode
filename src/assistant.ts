'use strict';

import * as openai from 'openai';

export function IDEAssistant(apiKey: string | undefined, model: string) {

  const api = new openai.OpenAI({ apiKey: apiKey });

  const prompt =
    `You are an assistant that helps me complete unfinished Effekt programs.
    The syntax <> is used to denote "holes", that marks a missing piece of code that still need to be filled in. Holes may show up in statement (i.e., foo; <>; bar) or expression position (i.e., val x = <>; bar).

    ### Uncertainty
    It is ok to not be sure what an answer is. In this case, try to do your best and then use <> to leave holes to be filled in the future.
    ~~~
    light match {
      case Red(duration) => <>
      case Yellow() => <>
      case Green() => <>
    }
    ~~~

    ## The Interaction
    Each prompt interaction will be structures as follows:

    1. I'll give you a Effekt program that contains one hole (that is, <>).
    2. You respond ONLY with code that should REPLACE the hole.

    ## THINGS YOU SHOULD NEVER DO
    - do not reply with markdown.
    - do not repeat the input program or parts of the program.
    - do not explain the code or your answer.
    `
  const exampleInput1 = `
    def add(n: Int, m: Int) = <>
  `
  const exampleOutput1 = `n + m`


  const exampleInput2 = `
def emptyQueue[R](): Dequeue[R] = Dequeue(Nil(), 0, Nil(), 0)

def isEmpty[R](dq: Dequeue[R]): Boolean = dq match {
    case Dequeue(f, fs, r, rs) => (fs == 0) && (rs == 0)
}

def size[R](dq: Dequeue[R]): Int = dq match {
    case Dequeue(f, fs, r, rs) => fs + rs
}

def first[R](dq: Dequeue[R]): Option[R] = <>

def last[R](dq: Dequeue[R]): Option[R] = dq match {
    case Dequeue(f, fs, r, rs) =>
      if ((fs == 1) && (rs == 0)) { f.headOption }
      else { r.headOption }
}`
  const exampleOutput2 = `dq match {
    case Dequeue(f, fs, r, rs) =>
      if ((fs == 0) && (rs == 1)) { r.headOption }
      else { f.headOption }
}`

  return {
    complete: async function(textWithHole: string) {
      console.log("Trying to complete", textWithHole)
      const params: openai.OpenAI.Chat.ChatCompletionCreateParams = {
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: exampleInput1 },
            { role: 'assistant', content: exampleOutput1 },
            { role: 'user', content: exampleInput2 },
            { role: 'assistant', content: exampleOutput2 },
            { role: 'user', content: textWithHole }
          ],
          model: model,
      };
      const result = await api.chat.completions.create(params)
      const message = result.choices.at(0)?.message.content
      return message
    }
  }
}
