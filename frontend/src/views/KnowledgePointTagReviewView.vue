<template>
  <div class="app-page app-container container-xl py-4">
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb">
        <li class="breadcrumb-item"><router-link to="/knowledge-points">章节 / 知识点</router-link></li>
        <li class="breadcrumb-item"><router-link to="/knowledge-points/import">知识图谱工作流</router-link></li>
        <li class="breadcrumb-item active">打标审核</li>
      </ol>
    </nav>
    <h1 class="h4 mb-3">KP 打标审核</h1>
    <kp-tag-job-list ref="jobList" :selected-job-id="jobId" />
    <kp-tag-job-review-panel
      v-if="jobId"
      :job-id="jobId"
      :subject="subject"
      :kp-tree="kpTree"
      @applied="onApplied"
      @job-loaded="onJobLoaded"
    />
  </div>
</template>

<script>
import axios from 'axios';
import KpTagJobReviewPanel from '../components/KpTagJobReviewPanel.vue';
import KpTagJobList from '../components/KpTagJobList.vue';

export default {
  name: 'KnowledgePointTagReviewView',
  components: { KpTagJobReviewPanel, KpTagJobList },
  data() {
    return {
      subject: '解析几何',
      kpTree: [],
    };
  },
  computed: {
    jobId() {
      return this.$route.params.jobId || '';
    },
  },
  watch: {
    jobId: {
      immediate: true,
      handler() {
        this.loadKpTree();
      },
    },
  },
  methods: {
    onJobLoaded(job) {
      if (job?.subject) this.subject = job.subject;
      this.loadKpTree();
    },
    async loadKpTree() {
      try {
        const { data } = await axios.get('/knowledge-points/tree', {
          params: { subject: this.subject.trim() || undefined },
        });
        this.kpTree = data.nodes || [];
      } catch {
        this.kpTree = [];
      }
    },
    onApplied() {
      this.$refs.jobList?.refresh();
    },
  },
};
</script>
