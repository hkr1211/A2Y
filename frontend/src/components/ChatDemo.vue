<template>
  <div class="chat-demo">
    <el-card class="demo-card">
      <template #header>
        <div class="card-header">
          <span>聊天功能演示</span>
        </div>
      </template>
      
      <div class="demo-content">
        <p>这是聊天功能的演示页面。点击下面的按钮来测试聊天功能：</p>
        
        <div class="demo-buttons">
          <el-button 
            type="primary" 
            @click="openInquiryChat"
            :icon="ChatDotRound"
          >
            打开询单聊天
          </el-button>
          
          <el-button 
            type="success" 
            @click="openOrderChat"
            :icon="ChatDotRound"
          >
            打开订单聊天
          </el-button>
        </div>
        
        <div class="demo-info">
          <h3>聊天功能特性：</h3>
          <ul>
            <li>实时消息传输（基于Socket.IO）</li>
            <li>消息翻译功能（中日文互译）</li>
            <li>输入状态指示器</li>
            <li>未读消息计数</li>
            <li>聊天窗口最小化/最大化</li>
            <li>消息删除功能</li>
            <li>批量翻译功能</li>
          </ul>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue';
import { ChatDotRound } from '@element-plus/icons-vue';

const chatManager = inject('chatManager');

const openInquiryChat = () => {
  if (chatManager?.value) {
    chatManager.value.openChat('demo-inquiry-1', 'inquiry', '演示询单 INQ-001');
  }
};

const openOrderChat = () => {
  if (chatManager?.value) {
    chatManager.value.openChat('demo-order-1', 'order', '演示订单 ORD-001');
  }
};
</script>

<style scoped>
.chat-demo {
  padding: 20px;
}

.demo-card {
  max-width: 600px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 18px;
}

.demo-content {
  text-align: center;
}

.demo-buttons {
  margin: 30px 0;
  display: flex;
  gap: 20px;
  justify-content: center;
}

.demo-info {
  margin-top: 40px;
  text-align: left;
}

.demo-info h3 {
  color: var(--el-color-primary);
  margin-bottom: 15px;
}

.demo-info ul {
  list-style-type: none;
  padding: 0;
}

.demo-info li {
  padding: 8px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
  position: relative;
  padding-left: 20px;
}

.demo-info li:before {
  content: '✓';
  color: var(--el-color-success);
  font-weight: bold;
  position: absolute;
  left: 0;
}

.demo-info li:last-child {
  border-bottom: none;
}
</style>