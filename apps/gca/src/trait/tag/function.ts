export const TAG_FUNCTION_TYPES = [`math`, `text_processing`, `directives`, `data_file_commands`] as const
export type TagFunctionType = (typeof TAG_FUNCTION_TYPES)[number]

export const TAG_FUNCTION_NAMES = [`math_functions`, `special_case_substitutions`, `text_functions`, `directives`, `data_file_commands`] as const
export type TagFunctionName = (typeof TAG_FUNCTION_NAMES)[number]

export type TagFunctionComponent = {
  type: TagFunctionType
  name: TagFunctionName
  text: string
}
