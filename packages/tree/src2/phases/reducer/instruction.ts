import Type from "../../type/base"

export interface BaseNodeInstruction {
  protocol: string
}

export interface GenericNodeInstruction extends BaseNodeInstruction {
  protocol: `process-child` | `elementary-algebra` | `pass` | `custom`
}

export interface GetValueNodeInstruction extends BaseNodeInstruction {
  protocol: `get-value`
  type: `string` | `number` | `boolean` | `any` | `quantity`
  asIdentifier?: boolean
}

export interface TypeNodeInstruction extends BaseNodeInstruction {
  protocol: `normalize`
  type: Type
}
export interface ApplyArgumentsNodeInstruction extends BaseNodeInstruction {
  protocol: `apply-arguments`
  index: number
}

export type NodeInstruction = GenericNodeInstruction | GetValueNodeInstruction | TypeNodeInstruction | ApplyArgumentsNodeInstruction

export type TNodeInstructionFactory<TInstruction extends NodeInstruction = NodeInstruction> = (...args: any[]) => TInstruction

export const CUSTOM: TNodeInstructionFactory<GenericNodeInstruction> = () => ({ protocol: `custom` })
export const PASS: TNodeInstructionFactory<GenericNodeInstruction> = () => ({ protocol: `pass` })
export const GET_VALUE: TNodeInstructionFactory<GetValueNodeInstruction> = (type: GetValueNodeInstruction[`type`], asIdentifier) => ({ protocol: `get-value`, type, asIdentifier })
export const PROCESS_CHILD: TNodeInstructionFactory<GenericNodeInstruction> = () => ({ protocol: `process-child` })
export const ELEMENTARY_ALGEBRA: TNodeInstructionFactory<GenericNodeInstruction> = () => ({ protocol: `elementary-algebra` })
export const NORMALIZE: TNodeInstructionFactory<TypeNodeInstruction> = type => ({ protocol: `normalize`, type })
export const APPLY_ARGUMENTS: TNodeInstructionFactory<ApplyArgumentsNodeInstruction> = (index: number = 0) => ({ protocol: `apply-arguments`, index })
