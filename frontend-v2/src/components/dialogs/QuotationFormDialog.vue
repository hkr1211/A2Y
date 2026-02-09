<template>
  <el-dialog
    :model-value="visible"
    :title="$t('quotation.create')"
    width="500px"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="100px"
    >
      <el-form-item :label="$t('quotation.unitPrice')" prop="unitPrice">
        <el-input-number
          v-model="form.unitPrice"
          :min="0"
          :precision="2"
          :step="0.1"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item :label="$t('quotation.totalPrice')" prop="totalPrice">
        <el-input-number
          v-model="form.totalPrice"
          :min="0"
          :precision="2"
          :step="1"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item
        :label="$t('quotation.deliveryDays')"
        prop="deliveryDays"
      >
        <el-input-number
          v-model="form.deliveryDays"
          :min="1"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item :label="$t('quotation.remarks')">
        <el-input
          v-model="form.remarks"
          type="textarea"
          :rows="2"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="handleClose">{{ $t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="saving" @click="handleSubmit">
        {{ $t('common.submit') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { createQuotation } from '@/services/quotation';

const props = defineProps<{
  visible: boolean;
  inquiryId: string;
  quantity: number;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  saved: [];
}>();

const formRef = ref<FormInstance>();
const saving = ref(false);

const form = reactive({
  unitPrice: 0,
  totalPrice: 0,
  deliveryDays: 30,
  remarks: '',
});

const rules: FormRules = {
  unitPrice: [
    { required: true, message: '请输入单价', trigger: 'blur' },
  ],
  totalPrice: [
    { required: true, message: '请输入总价', trigger: 'blur' },
  ],
  deliveryDays: [
    { required: true, message: '请输入交货天数', trigger: 'blur' },
  ],
};

// Auto-calculate totalPrice when unitPrice changes
watch(
  () => form.unitPrice,
  (val) => {
    if (val > 0 && props.quantity > 0) {
      form.totalPrice = parseFloat((val * props.quantity).toFixed(2));
    }
  }
);

watch(
  () => props.visible,
  (val) => {
    if (val) {
      form.unitPrice = 0;
      form.totalPrice = 0;
      form.deliveryDays = 30;
      form.remarks = '';
    }
  }
);

function handleClose() {
  formRef.value?.resetFields();
  emit('update:visible', false);
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  saving.value = true;
  try {
    await createQuotation({
      inquiryId: props.inquiryId,
      unitPrice: form.unitPrice,
      totalPrice: form.totalPrice,
      deliveryDays: form.deliveryDays,
      remarks: form.remarks || undefined,
    });
    ElMessage.success('报价提交成功');
    handleClose();
    emit('saved');
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '报价提交失败');
  } finally {
    saving.value = false;
  }
}
</script>
