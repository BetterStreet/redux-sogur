//import { fetchEntity } from 'client/core/sagas'
import { fork, put, take, race, all } from "redux-saga/effects";
import { takeLatest } from "redux-saga/effects";
import { callApi, fetchApi, makeEndpoint } from "client/core/api";

/*
    #Params
        request: action request entity
        api: function calling api
    #Methods
        success: generatior function
        failure: generatior function
*/

class RequestSagas {
  constructor(request, api, options = {}) {
    this.request = request;
    this.api = api;
    this.saga = this.saga.bind(this);
    this.start = this.start.bind(this);
    this.success = this.success.bind(this);
    this.failure = this.failure.bind(this);
    this.options = options;
  }

  *start(action) {
    yield put(this.request.actions.request());
    const endpoint = makeEndpoint(this.api.endpoint, action.params);
    const { method } = this.api;
    if (method.toLowerCase() === "get") {
      const { res, cancel } = yield race({
        res: fetchApi(endpoint, action.params),
        cancel: take(this.request.actions.cancel().type)
      });
      if (cancel) return;

      const { response, error } = res;
      if (response) yield put(this.request.actions.success(response));
      else yield put(this.request.actions.failure(error));
    } else {
      const emitter = callApi(
        endpoint,
        this.api.method,
        action.payload,
        action.files,
        this.request.actions,
        this.options.progress
      );
      yield fork(this.progressListener, emitter);
    }
  }

  *success() {
    if (__DEV) console.info(this.request.TYPES.SUCCESS);
  }

  *failure() {
    if (__DEV) console.warn(this.request.TYPES.FAILURE);
  }

  *progressListener(chan) {
    while (true) {
      const action = yield take(chan);
      yield put(action);
    }
  }

  *saga() {
    const effect = this.options.effect
      ? sagaEffects[this.options.effect]
      : takeLatest;
    yield all([
      effect(this.request.ACTION, this.start),
      effect(this.request.TYPES.SUCCESS, this.success),
      effect(this.request.TYPES.FAILURE, this.failure)
    ]);
  }
}

export default RequestSagas;
