import { parse, Sequence } from "cubing/alg";
import {
  Invert,
  KPuzzleDefinition,
  Transformation,
  CanonicalSequenceIterator,
  Canonicalize,
  SearchSequence,
  IdentityTransformation,
} from "cubing/kpuzzle";
import { SGSCachedData } from "./sgs";

const DEFAULT_TREMBLE_COUNT = 840000;

function goodRandomMoves(canon: Canonicalize, randgen: Array<Array<string>>): Transformation {
  var scramble = "";
  for (const a of randgen) {
    if (a) { // not all elements may be defined
      scramble = scramble + " " + a[Math.floor(a.length * Math.random())];
    }
  }
  return canon.sequenceToSearchSequence(parse(scramble)).trans;
}

export class TrembleSolver {
  private puzzle: KPuzzleDefinition;
  private canon: Canonicalize;
  private st;

  private baseorder: Array<any>; // TODO
  private esgs: Array<any>; // TODO
  private randgen: Array<Array<string>>;

  constructor(private def: KPuzzleDefinition, sgs: SGSCachedData) {
    this.st = IdentityTransformation(def);
    this.baseorder = sgs.baseorder;
    this.esgs = sgs.esgs;
    this.randgen = sgs.randgen;
    this.canon = new Canonicalize(def);
  }

  public goodRandomMoves(): Transformation {
    return goodRandomMoves(this.canon, this.randgen);
  }

  public async solve(
    state: Transformation,
    trembleCount: number = DEFAULT_TREMBLE_COUNT
  ): Promise<Sequence> {
    let bestAlg: SearchSequence;;
    var best = 1000000;
    const csg = new CanonicalSequenceIterator(this.canon, state).generator();
    for (let i=0; i<trembleCount; i++) {
      const ss = csg.next().value.clone();
      this.sgsPhaseSolve(ss);
      if (ss.moveseq.length < best) {
        best = ss.moveseq.length;
        bestAlg = ss;
      }
    }
    return parse(bestAlg.getSequenceAsString());
  }
  public async solveForever (
    state: Transformation,
  ): Promise<Sequence> {
    let bestAlg: SearchSequence;;
    var best = 1000000;
    const csg = new CanonicalSequenceIterator(this.canon, state).generator();
    while (true) {
      const ss = csg.next().value.clone();
      this.sgsPhaseSolve(ss);
      if (ss.moveseq.length < best) {
        best = ss.moveseq.length;
        bestAlg = ss;
        console.log("Length " + best + " alg " + ss.getSequenceAsString());
      }
    }
    return parse(bestAlg.getSequenceAsString());
  }

  private sgsPhaseSolve(ss: SearchSequence): void {
    for (var i = 0; i < this.baseorder.length; i++) {
      var set = this.baseorder[i][0];
      var ind = this.baseorder[i][1];
      let st4 = ss.trans;
      if (
        st4[set].permutation[ind] !== this.st[set].permutation[ind] ||
        st4[set].orientation[ind] !== this.st[set].orientation[ind]
      ) {
        var st4i = Invert(this.def, st4);
        var a = this.esgs[i][st4i[set].permutation[ind]][
          st4i[set].orientation[ind]
        ];
        if (a === undefined) throw "Missing algorithm in sgs or esgs?";
        ss.mergeSequence(a[1]);
        st4 = ss.trans;
        if (
          st4[set].permutation[ind] !== this.st[set].permutation[ind] ||
          st4[set].orientation[ind] !== this.st[set].orientation[ind]
        ) {
          console.log("Fail.");
        }
      }
    }
  }
}
