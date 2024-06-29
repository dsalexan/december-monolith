export class Cell {
  content: string
  start: number
  end: number

  get length() {
    return this.end - this.start + 1
  }

  get isValid() {
    return this.length >= 0
  }

  static empty(start: number = 0) {
    return new Cell(``, start, start - 1)
  }

  constructor(content: string, start: number, end: number) {
    this.content = content
    this.start = start ?? 0
    this.end = end ?? this.start + content.length - 1
  }

  repr() {
    return `[${this.start}->${this.end}] ${this.content}`
  }
}
