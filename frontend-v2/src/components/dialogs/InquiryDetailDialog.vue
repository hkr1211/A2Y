<template>
  <el-dialog
    :model-value="visible"
    :title="$t('inquiry.detail')"
    width="600px"
    @close="handleClose"
  >
    <el-descriptions v-if="inquiry" :column="2" border>
      <el-descriptions-item :label="$t('inquiry.inquiryNo')" :span="2">
        {{ inquiry.inquiryNumber }}
      </el-descriptions-item>
      <el-descriptions-item :label="$t('inquiry.status')">
        <el-tag :type="statusTagType(inquiry.status)">
          {{ $t(`inquiry.${inquiry.status}`) }}
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item :label="$t('inquiry.quantity')">
        {{ inquiry.quantity }}
      </el-descriptions-item>
      <el-descriptions-item :label="$t('inquiry.productName')" :span="2">
        {{ inquiry.productName }}
      </el-descriptions-item>
      <el-descriptions-item :label="$t('inquiry.materialType')" :span="2">
        {{ inquiry.materialType }}
      </el-descriptions-item>
      <el-descriptions-item :label="$t('inquiry.specifications')" :span="2">
        {{ inquiry.specifications }}
      </el-descriptions-item>
      <el-descriptions-item
        v-if="inquiry.specialRequirements"
        :label="$t('inquiry.specialRequirements')"
        :span="2"
      >
        {{ inquiry.specialRequirements }}
      </el-descriptions-item>
      <el-descriptions-item :label="$t('inquiry.createdAt')">
        {{ formatDate(inquiry.createdAt) }}
      </el-descriptions-item>
      <el-descriptions-item :label="$t('inquiry.creator')">
        {{ creatorName(inquiry.createdBy) }}
      </el-descriptions-item>
    </el-descriptions>
    <template #footer>
      <el-button @click="handleClose">{{ $t('common.confirm') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { INQUIRY_STATUS_TYPES } from '@/utils/constants';
import type { Inquiry, InquiryStatus } from '@/types';

defineProps<{
  visible: boolean;
  inquiry: Inquiry | null;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
}>();

function statusTagType(status: InquiryStatus) {
  return INQUIRY_STATUS_TYPES[status] || 'info';
}

function creatorName(
  createdBy: { id: string; username: string } | string | undefined
) {
  if (!createdBy) return '-';
  if (typeof createdBy === 'string') return createdBy;
  return createdBy.username;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('zh-CN');
}

function handleClose() {
  emit('update:visible', false);
}
</script>
