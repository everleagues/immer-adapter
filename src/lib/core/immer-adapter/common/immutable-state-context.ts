import { StateContext, StateOperator } from '@ngxs/store';
import { ExistingState } from '@ngxs/store/operators';
import { createDraft, finishDraft, Objectish } from 'immer';
import { Observable } from 'rxjs';

export class ImmutableStateContext<T extends any> implements StateContext<T> {
  private frozenState: T | null = null;

  constructor(private ctx: StateContext<T>) {
    ImmutableStateContext.autobindStateContext(this);
  }

  private static autobindStateContext(context: any): void {
    for (const prop of Object.getOwnPropertyNames(Object.getPrototypeOf(context))) {
      if (prop === 'constructor' || typeof context[prop] !== 'function') {
        continue;
      }

      context[prop] = context[prop].bind(context);
    }
  }

  public getState(): T {
    this.frozenState = createDraft(this.ctx.getState() as Objectish) as T;
    return this.frozenState;
  }

  public setState(val: T | StateOperator<T>): void {
    let state: any;

    if (typeof val === 'function') {
      let newState;
      const oldState: ExistingState<T> = createDraft(this.ctx.getState() as Objectish) as ExistingState<T>;
      const operator: StateOperator<T> = val as StateOperator<T>;
      const mutatedOldState: T = operator(oldState);

      if (this.frozenState === mutatedOldState) {
        newState = finishDraft(this.frozenState);
        finishDraft(oldState);
      } else {
        const mutateOutsideOperator: boolean = oldState !== mutatedOldState;
        if (mutateOutsideOperator) {
          newState = mutatedOldState;
          finishDraft(oldState);
        } else {
          newState = finishDraft(mutatedOldState);
        }
      }

      state = newState;
    } else {
      state = finishDraft(val);
    }

    this.frozenState = null;
    return this.ctx.setState(state);
  }

  public patchState(val: Partial<T>): void {
    return this.ctx.patchState(finishDraft(val) as Partial<T>);
  }

  public dispatch(actions: any | any[]): Observable<void> {
    return this.ctx.dispatch(actions);
  }
}
