import { createRouter, createWebHistory } from "vue-router";
import QuestionListView from "../views/QuestionListView.vue";
import QuestionEditView from "../views/QuestionEditView.vue";
import QuestionAddView from "../views/QuestionAddView.vue";
import RegisterView from "../views/RegisterView.vue";
import LoginView from "../views/LoginView.vue";
import LatexImportView from "../views/LatexImportView.vue";
import LatexExportView from "../views/LatexExportView.vue";
import KnowledgePointView from "../views/KnowledgePointView.vue";
import DuplicateReviewView from "../views/DuplicateReviewView.vue";

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
    meta: { requiresAuth: true },
  },
  {
    path: "/question-add",
    name: "question-add",
    component: QuestionAddView,
    meta: { requiresAuth: true },
  },
  {
    path: "/question-edit/:id",
    name: "question-edit",
    component: QuestionEditView,
    meta: { requiresAuth: true },
  },
  {
    path: "/latex-import",
    name: "latex-import",
    component: LatexImportView,
    meta: { requiresAuth: true },
  },
  {
    path: "/latex-export",
    name: "latex-export",
    component: LatexExportView,
    meta: { requiresAuth: true },
  },
  {
    path: "/knowledge-points",
    name: "knowledge-points",
    component: KnowledgePointView,
    meta: { requiresAuth: true },
  },
  {
    path: "/duplicates",
    name: "duplicates",
    component: DuplicateReviewView,
    meta: { requiresAuth: true },
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

router.beforeEach((to, from, next) => {
  const isAuthed = !!localStorage.getItem('currentUser');
  if (to.meta.requiresAuth && !isAuthed) {
    return next({ name: 'login', query: { redirect: to.fullPath } });
  }
  if ((to.name === 'login' || to.name === 'register') && isAuthed) {
    return next({ name: 'question-list' });
  }
  next();
});

export default router;
