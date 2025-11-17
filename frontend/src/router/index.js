import { createRouter, createWebHistory } from "vue-router";
import QuestionListView from "../views/QuestionListView.vue";
import QuestionEditView from "../views/QuestionEditView.vue";
import QuestionAddView from "../views/QuestionAddView.vue";
import RegisterView from "../views/RegisterView.vue";
import LoginView from "../views/LoginView.vue";
import LatexImportView from "../views/LatexImportView.vue";
import LatexExportView from "../views/LatexExportView.vue";

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
  {
    path: "/latex-import",
    name: "latex-import",
    component: LatexImportView,
  },
  {
    path: "/latex-export",
    name: "latex-export",
    component: LatexExportView,
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

export default router;
