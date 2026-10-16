import { Injectable } from '@angular/core';
import { RegexExplanationNode, RegexParser } from './regex-parser';

/** Nó da explicação "achatado" para renderização em lista com indentação. */
export interface ExplanationRow {
  readonly node: RegexExplanationNode;
  readonly depth: number;
}

@Injectable({ providedIn: 'root' })
export class RegexExplainerService {
  explain(pattern: string, flags: string): RegexExplanationNode[] {
    return new RegexParser(pattern, flags).parse();
  }

  flatten(nodes: readonly RegexExplanationNode[], depth = 0): ExplanationRow[] {
    return nodes.flatMap((node) => [{ node, depth }, ...this.flatten(node.children, depth + 1)]);
  }
}
