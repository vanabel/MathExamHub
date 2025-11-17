import { createRouter, createWebHistory } from "vue-router";
import QuestionListView from "../views/QuestionListView.vue";
import QuestionEditView from "../views/QuestionEditView.vue";
import QuestionAddView from "../views/QuestionAddView.vue";
import RegisterView from "../views/RegisterView.vue";
import LoginView from "../views/LoginView.vue";

const routes = [
  {
    path: "/",
    redirect: "/login",
  },
  {
    path: "/login",
    name: "login",
    component: LoginView,
  },
  {
    path: "/register",
    name: "register",
    component: RegisterView,
  },
  {
    path: "/question-list",
    name: "question-list",
    component: QuestionListView,
  },
  {
    path: "/question-add",
    name: "question-add",
    component: QuestionAddView,
  },
  {
    path: "/question-edit/:id",
    name: "question-edit",
    component: QuestionEditView,
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

export default router;
