import Controller from "@ember/controller";
import { get, computed } from "@ember/object";
import { task, hash } from "ember-concurrency";
import QueryParams from "ember-parachute";
import moment from "moment";
import {
  underscoreQueryParams,
  serializeParachuteQueryParams,
} from "timed/utils/query-params";

const DATE_FORMAT = "YYYY-MM-DD";

const serializeMoment = (momentObject) =>
  (momentObject && momentObject.format(DATE_FORMAT)) || null;

const deserializeMoment = (momentString) =>
  (momentString && moment(momentString, DATE_FORMAT)) || null;

const TYPES = {
  year: { include: "", requiredParams: [] },
  month: { include: "", requiredParams: [] },
  customer: { include: "customer", requiredParams: [] },
  project: {
    include: "project,project.customer",
    requiredParams: ["customer"],
  },
  task: {
    include: "task,task.project,task.project.customer",
    requiredParams: ["customer", "project"],
  },
  user: { include: "user", requiredParams: [] },
};

export const StatisticsQueryParams = new QueryParams({
  customer: {
    defaultValue: null,
    replace: true,
    refresh: true,
  },
  project: {
    defaultValue: null,
    replace: true,
    refresh: true,
  },
  task: {
    defaultValue: null,
    replace: true,
    refresh: true,
  },
  user: {
    defaultValue: null,
    replace: true,
    refresh: true,
  },
  reviewer: {
    defaultValue: null,
    replace: true,
    refresh: true,
  },
  billingType: {
    defaultValue: null,
    replace: true,
    refresh: true,
  },
  costCenter: {
    defaultValue: null,
    replace: true,
    refresh: true,
  },
  fromDate: {
    defaultValue: null,
    replace: true,
    refresh: true,
    serialize: serializeMoment,
    deserialize: deserializeMoment,
  },
  toDate: {
    defaultValue: null,
    replace: true,
    refresh: true,
    serialize: serializeMoment,
    deserialize: deserializeMoment,
  },
  review: {
    defaultValue: "",
    replace: true,
    refresh: true,
  },
  notBillable: {
    defaultValue: "",
    replace: true,
    refresh: true,
  },
  verified: {
    defaultValue: "",
    replace: true,
    refresh: true,
  },
  billed: {
    defaultValue: "",
    replace: true,
    refresh: true,
  },
  type: {
    defaultValue: Object.keys(TYPES)[0],
    replace: true,
    refresh: true,
  },
  ordering: {
    defaultValue: "",
    replace: true,
    refresh: true,
  },
});

export default Controller.extend(StatisticsQueryParams.Mixin, {
  types: Object.keys(TYPES),

  billingTypes: computed(
    "prefetchData.lastSuccessful.value.billingTypes",
    "store",
    function () {
      return this.store.findAll("billing-type");
    }
  ),

  costCenters: computed(
    "prefetchData.lastSuccessful.value.costCenters",
    "store",
    function () {
      return this.store.findAll("cost-center");
    }
  ),

  selectedCustomer: computed(
    "customer",
    "prefetchData.lastSuccessful.value.customer",
    "store",
    function () {
      return this.customer && this.store.peekRecord("customer", this.customer);
    }
  ),

  selectedProject: computed(
    "prefetchData.lastSuccessful.value.project",
    "project",
    "store",
    function () {
      return this.project && this.store.peekRecord("project", this.project);
    }
  ),

  selectedTask: computed(
    "prefetchData.lastSuccessful.value.task",
    "store",
    "task",
    function () {
      return this.task && this.store.peekRecord("task", this.task);
    }
  ),

  selectedUser: computed(
    "prefetchData.lastSuccessful.value.user",
    "store",
    "user",
    function () {
      return this.user && this.store.peekRecord("user", this.user);
    }
  ),

  selectedReviewer: computed(
    "prefetchData.lastSuccessful.value.reviewer",
    "reviewer",
    "store",
    function () {
      return this.reviewer && this.store.peekRecord("user", this.reviewer);
    }
  ),

  missingParams: computed(
    "requiredParams.[]",
    `queryParamsState.{observed}.changed`,
    function () {
      return this.requiredParams.filter(
        (param) => !this.get(`queryParamsState.${param}.changed`)
      );
    }
  ),

  setup() {
    const observed = Object.keys(TYPES).reduce((set, key) => {
      return [
        ...set,
        ...get(TYPES, `${key}.requiredParams`).filter((p) => !set.includes(p)),
      ];
    }, []);
    this.set("observed", observed.join(","));

    this.prefetchData.perform();
    this.data.perform();
  },

  reset(_, isExiting) {
    /* istanbul ignore next */
    if (isExiting) {
      this.resetQueryParams();
    }
  },

  queryParamsDidChange({ shouldRefresh, changed }) {
    if (shouldRefresh) {
      this.data.perform();
    }

    if (Object.keys(changed).includes("type")) {
      this.resetQueryParams("ordering");
    }
  },

  appliedFilters: computed("queryParamsState", function () {
    return Object.keys(this.queryParamsState).filter((key) => {
      return this.get(`queryParamsState.${key}.changed`) && key !== "type";
    });
  }),

  requiredParams: computed("type", function () {
    return TYPES[this.type].requiredParams;
  }),

  prefetchData: task(function* () {
    const {
      customer: customerId,
      project: projectId,
      task: taskId,
      user: userId,
      reviewer: reviewerId,
    } = this.allQueryParams;

    return yield hash({
      customer: customerId && this.store.findRecord("customer", customerId),
      project: projectId && this.store.findRecord("project", projectId),
      task: taskId && this.store.findRecord("task", taskId),
      user: userId && this.store.findRecord("user", userId),
      reviewer: reviewerId && this.store.findRecord("user", reviewerId),
      billingTypes: this.store.findAll("billing-type"),
      costCenters: this.store.findAll("cost-center"),
    });
  }).restartable(),

  data: task(function* () {
    if (this.get("missingParams.length")) {
      return null;
    }

    const type = this.type;

    let params = underscoreQueryParams(
      serializeParachuteQueryParams(this.allQueryParams, StatisticsQueryParams)
    );

    params = Object.keys(params).reduce((obj, key) => {
      return key !== "type" ? { ...obj, [key]: get(params, key) } : obj;
    }, {});

    return yield this.store.query(`${type}-statistic`, {
      include: TYPES[type].include,
      ...params,
    });
  }).restartable(),

  actions: {
    setModelFilter(key, value) {
      this.set(key, value && value.id);
    },

    reset() {
      this.resetQueryParams(
        Object.keys(this.allQueryParams).filter((qp) => qp !== "type")
      );
    },
  },
});
