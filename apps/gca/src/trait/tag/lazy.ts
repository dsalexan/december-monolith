export const TAG_LAZY_TYPES = [`input`, `list`]
export type TagLazyType = (typeof TAG_LAZY_TYPES)[number]

export type TagLazyComponent = {
  id: number
  type: TagLazyType
  // name: TagLazyName
  text: string
}

export function makeLazyComponent(id: number, type: TagLazyType, text: string): TagLazyComponent {
  return { id, type, text }
}

export type TagLazyValue = {
  template: string
  components: TagLazyComponent[]
}

export function makeLazyValue(template: string, ...components: TagLazyComponent[]): TagLazyValue {
  return { template, components }
}
