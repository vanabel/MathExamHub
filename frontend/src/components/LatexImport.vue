<template>
  <div class="latex-import-container">
    <div class="container">
      <!-- 页面头部 -->
      <div class="page-header mb-4">
        <nav aria-label="breadcrumb" class="mb-3">
          <ol class="breadcrumb">
            <li class="breadcrumb-item">
              <router-link to="/question-list" class="text-decoration-none">
                <i class="bi bi-house"></i> 题目列表
              </router-link>
            </li>
            <li class="breadcrumb-item active" aria-current="page">导入 LaTeX 文件</li>
          </ol>
        </nav>
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h1 class="page-title mb-1">
              <i class="bi bi-upload"></i> 导入 LaTeX 文件
            </h1>
            <p class="text-muted mb-0">上传 .tex 文件，自动解析并导入题目到题库</p>
          </div>
          <router-link to="/question-list" class="btn btn-outline-secondary">
            <i class="bi bi-arrow-left"></i> 返回列表
          </router-link>
        </div>
      </div>

      <div class="row">
        <div class="col-lg-8 mx-auto">
          <div class="card">
            <div class="card-body">
              <!-- 文件上传区域 -->
              <div class="upload-area mb-4">
                <input
                  ref="fileInput"
                  type="file"
                  accept=".tex"
                  @change="handleFileSelect"
                  class="d-none"
                  id="fileInput"
                />
                <input
                  ref="imageInput"
                  type="file"
                  accept=".png,.jpg,.jpeg,.gif,.pdf"
                  @change="handleImageSelect"
                  class="d-none"
                  multiple
                  id="imageInput"
                />
                <label
                  for="fileInput"
                  class="upload-label"
                  :class="{ 'dragover': isDragging, 'has-file': selectedFile }"
                  @dragover.prevent="isDragging = true"
                  @dragleave.prevent="isDragging = false"
                  @drop.prevent="handleDrop"
                >
                  <div class="upload-content">
                    <i class="bi bi-cloud-upload display-4 text-primary mb-3"></i>
                    <h5 v-if="!selectedFile">点击选择文件或拖拽文件到此处</h5>
                    <h5 v-else class="text-success">
                      <i class="bi bi-check-circle"></i> {{ selectedFile.name }}
                    </h5>
                    <p class="text-muted mb-0">支持 .tex 格式文件，最大 10MB</p>
                    <p class="text-muted mb-0 small">图片支持：png/jpg/jpeg/gif/pdf</p>
                  </div>
                </label>
                <!-- 图片文件上传区域 -->
                <div class="mt-3">
                  <label for="imageInput" class="btn btn-outline-primary btn-sm">
                    <i class="bi bi-image"></i> 上传图片文件（可选）
                  </label>
                  <div v-if="selectedImages.length > 0" class="mt-2">
                    <small class="text-muted">已选择 {{ selectedImages.length }} 个文件：</small>
                    <ul class="list-unstyled mt-1">
                      <li v-for="(img, index) in selectedImages" :key="index" class="text-sm">
                        <i :class="img.name.endsWith('.pdf') ? 'bi bi-file-pdf' : 'bi bi-file-image'"></i> {{ img.name }}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <!-- 导入选项 -->
              <div class="import-options mb-4">
                <h5 class="mb-3">
                  <i class="bi bi-gear"></i> 导入选项
                </h5>
                <div class="row g-3">
                  <div class="col-md-6">
                    <label for="createdBy" class="form-label">创建者</label>
                    <input
                      v-model="createdBy"
                      id="createdBy"
                      type="text"
                      class="form-control"
                      placeholder="系统导入"
                    />
                  </div>
                </div>
              </div>

              <!-- 操作按钮 -->
              <div class="d-flex gap-2">
                <button
                  type="button"
                  class="btn btn-primary"
                  @click="importFile"
                  :disabled="!selectedFile || importing"
                >
                  <span v-if="importing" class="spinner-border spinner-border-sm me-2"></span>
                  <i v-else class="bi bi-upload"></i>
                  {{ importing ? '导入中...' : '开始导入' }}
                </button>
                <button
                  type="button"
                  class="btn btn-outline-secondary"
                  @click="resetForm"
                  :disabled="importing"
                >
                  <i class="bi bi-arrow-clockwise"></i> 重置
                </button>
              </div>

              <!-- 导入结果 -->
              <div v-if="importResult" class="import-result mt-4">
                <div
                  class="alert"
                  :class="{
                    'alert-success': importResult.success,
                    'alert-warning': !importResult.success,
                  }"
                >
                  <h5 class="alert-heading">
                    <i
                      :class="
                        importResult.success
                          ? 'bi bi-check-circle'
                          : 'bi bi-exclamation-triangle'
                      "
                    ></i>
                    {{ importResult.success ? '导入成功' : '导入完成（部分失败）' }}
                  </h5>
                  <p>
                    成功导入: <strong>{{ importResult.imported }}</strong> 道题目
                    <span v-if="importResult.failed > 0">
                      ，失败: <strong>{{ importResult.failed }}</strong> 道题目
                    </span>
                  </p>
                  <div v-if="importResult.errors && importResult.errors.length > 0" class="mt-3">
                    <details>
                      <summary class="cursor-pointer">查看错误详情</summary>
                      <ul class="mt-2 mb-0">
                        <li v-for="(error, index) in importResult.errors" :key="index">
                          {{ error.error }}
                        </li>
                      </ul>
                    </details>
                  </div>
                  <hr v-if="importResult.success" />
                  <div v-if="importResult.success" class="d-flex gap-2">
                    <router-link to="/question-list" class="btn btn-sm btn-primary">
                      查看题目列表
                    </router-link>
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-secondary"
                      @click="resetForm"
                    >
                      继续导入
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "LatexImport",
  data() {
    return {
      selectedFile: null,
      selectedImages: [],
      isDragging: false,
      importing: false,
      createdBy: "",
      importResult: null,
    };
  },
  methods: {
    handleFileSelect(event) {
      const file = event.target.files[0];
      if (file) {
        if (!file.name.endsWith(".tex")) {
          alert("请选择 .tex 格式的文件");
          return;
        }
        this.selectedFile = file;
        this.isDragging = false;
      }
    },
    handleDrop(event) {
      this.isDragging = false;
      const files = Array.from(event.dataTransfer.files);
      const texFile = files.find(f => f.name.endsWith(".tex"));
      const imageFiles = files.filter(f => 
        f.name.match(/\.(png|jpg|jpeg|gif|pdf)$/i)
      );
      
      if (texFile) {
        this.selectedFile = texFile;
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(texFile);
        this.$refs.fileInput.files = dataTransfer.files;
      }
      
      if (imageFiles.length > 0) {
        this.selectedImages = [...this.selectedImages, ...imageFiles];
        const dataTransfer = new DataTransfer();
        this.selectedImages.forEach(img => dataTransfer.items.add(img));
        this.$refs.imageInput.files = dataTransfer.files;
      }
      
      if (!texFile && imageFiles.length === 0) {
        alert("请选择 .tex 文件或图片文件");
      }
    },
    handleImageSelect(event) {
      const files = Array.from(event.target.files);
      const imageFiles = files.filter(f => 
        f.name.match(/\.(png|jpg|jpeg|gif|pdf)$/i)
      );
      if (imageFiles.length > 0) {
        this.selectedImages = [...this.selectedImages, ...imageFiles];
      }
    },
    async importFile() {
      if (!this.selectedFile) {
        alert("请先选择文件");
        return;
      }

      this.importing = true;
      this.importResult = null;

      const formData = new FormData();
      formData.append("file", this.selectedFile);
      // 添加图片文件
      this.selectedImages.forEach((img) => {
        formData.append("images", img);
      });
      if (this.createdBy) {
        formData.append("createdBy", this.createdBy);
      }

      try {
        const response = await axios.post("/questions/import/latex", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        this.importResult = response.data;
        if (response.data.success) {
          console.log("导入成功:", response.data);
        }
      } catch (error) {
        console.error("导入失败:", error);
        this.importResult = {
          success: false,
          imported: 0,
          failed: 1,
          errors: [
            {
              error: error.response?.data?.error || "导入失败，请检查文件格式",
            },
          ],
        };
      } finally {
        this.importing = false;
      }
    },
    resetForm() {
      this.selectedFile = null;
      this.selectedImages = [];
      this.importResult = null;
      this.createdBy = "";
      if (this.$refs.fileInput) {
        this.$refs.fileInput.value = "";
      }
      if (this.$refs.imageInput) {
        this.$refs.imageInput.value = "";
      }
    },
  },
};
</script>

<style scoped>
.latex-import-container {
  padding: 2rem 0;
}

.page-header {
  background: white;
  padding: 1.5rem 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.breadcrumb {
  margin-bottom: 0;
  background: transparent;
  padding: 0;
}

.breadcrumb-item a {
  color: #667eea;
  transition: color 0.2s;
}

.breadcrumb-item a:hover {
  color: #764ba2;
}

.page-title {
  color: #333;
  font-weight: 700;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.upload-area {
  margin-bottom: 2rem;
}

.upload-label {
  display: block;
  border: 2px dashed #ddd;
  border-radius: 12px;
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: #f8f9fa;
}

.upload-label:hover {
  border-color: #667eea;
  background: #f0f4ff;
}

.upload-label.dragover {
  border-color: #667eea;
  background: #e8f0fe;
}

.upload-label.has-file {
  border-color: #28a745;
  background: #f0fff4;
}

.upload-content {
  pointer-events: none;
}

.import-options {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
}

.import-result {
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.cursor-pointer {
  cursor: pointer;
}

.alert {
  border-radius: 8px;
}

.alert-heading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style>

