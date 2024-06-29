import type Node from ".."
import { Builder, paint } from "@december/logger"
import { NodeIssue, createNodeIssue } from "./issue"

export interface NodeValidatorOptions {}

export default class NodeValidator {
  node: Node

  // options are always defined at validate time
  options!: NodeValidatorOptions

  constructor(node: Node) {
    this.node = node
  }

  _defaultOptions(options: NodeValidatorOptions = {}) {
    this.options = options
  }

  _validate() {
    const node = this.node

    const issues = [] as NodeIssue[]

    const hasParent = !!node.parent
    const isRoot = node.isRoot()

    if (!hasParent && !isRoot) issues.push(createNodeIssue(`parentless`, node))
    // if (isNil(this.end)) issues.push(createNodeIssue(`unbalanced`, this, this.substring))

    return issues
  }

  validate(options: NodeValidatorOptions = {}) {
    this._defaultOptions(options)

    const issues = [] as NodeIssue[]

    issues.push(...this._validate())
    for (const child of this.node.children) {
      const { issues: childIssues } = child.validate()
      issues.push(...childIssues)
    }

    return { success: issues.length === 0, issues }
  }

  _tree(log: Builder) {
    const CAP = 200
    const node = this.node

    let substring = node.substring

    if (node.children.length > 0) {
      const passedCap = substring.length > CAP
      substring = substring.slice(0, passedCap ? CAP - 5 : substring.length)
      if (passedCap) substring = `${substring}${paint.bgGray.italic(`[...]`)}`
    }

    log
      .add(node.backgroundColor(` ${node.context} `))
      .add(paint.grey(`[${paint.bold(node.start)} → ${paint.bold(node.end)}]`))
      .add(paint.white.bgBlack(substring))
      .debug()
  }

  /** Print node in tree structure to facilitate debugging (usually after a failed validation) */
  tree(log?: Builder): true {
    this._tree(log)

    log.tab()
    for (let i = 0; i < this.node.children.length; i++) {
      const child = this.node.children[i]

      log.add(paint.grey.italic(i))
      child.validator.tree(log)
    }
    log.tab(-1)

    return true
  }
}
