import { Hydrator, HydratorProperties } from "@december/foundry/hydration"

export type ListHydratorProperties = HydratorProperties & {
  //
}

export default class ListHydrator extends Hydrator {
  hydrate(html: JQuery<HTMLElement>): void {
    super.hydrate(html)
  }

  _hydrate(): void {}

  _persist(): void {}
}
