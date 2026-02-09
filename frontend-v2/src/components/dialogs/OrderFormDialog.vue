<template>
  <el-dialog
    :model-value="visible"
    :title="$t('order.create')"
    width="600px"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="120px"
    >
      <el-form-item :label="$t('inquiry.productName')" prop="productName">
        <el-input v-model="form.productName" />
      </el-form-item>
      <el-form-item
        :label="$t('inquiry.materialType')"
        prop="materialType"
      >
        <el-input v-model="form.materialType" />
      </el-form-item>
      <el-form-item
        :label="$t('inquiry.specifications')"
        prop="specifications"
      >
        <el-input v-model="form.specifications" type="textarea" :rows="3" />
      </el-form-item>
      <el-form-item :label="$t('quotation.unitPrice')" prop="unitPrice">
        <el-input-number
          v-model="form.unitPrice"
          :min="0"
          :precision="2"
          :step="0.1"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item :label="$t('inquiry.quantity')" prop="quantity">
        <el-input-number v-model="form.quantity" :min="1" />
      </el-form-item>
      <el-form-item :label="$t('order.totalPrice')" prop="totalPrice">
        <el-input-number
          v-model="form.totalPrice"
          :min="0"
          :precision="2"
          :step="1"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item :label="$t('inquiry.specialRequirements')">
        <el-input
          v-model="form.specialRequirements"
          type="textarea"
          :rows="2"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="handleClose">{{ $t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="saving" @click="handleSubmit">
        {{ $t('common.save') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { createStandaloneOrder } from '@/services/order';

defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  saved: [];
}>();

const formRef = ref<FormInstance>();
const saving = ref(false);

const form = reactive({
  productName: '',
  materialType: '',
  specifications: '',
  specialRequirements: '',
  unitPrice: 0,
  quantity: 1,
  totalPrice: 0,
});

const rules: FormRules = {
  productName: [
    { required: true, message: '请输入产品名称', trigger: 'blur' },
  ],
  materialType: [
    { required: true, message: '请输入材质类型', trigger: 'blur' },
  ],
  specifications: [
    { required: true, message: '请输入规格说明', trigger: 'blur' },
  ],
  unitPrice: [
    { required: true, message: '请输入单价', trigger: 'blur' },
  ],
  quantity: [
    { required: true, message: '请输入数量', trigger: 'blur' },
  ],
  totalPrice: [
    { required: true, message: '请输入总价', trigger: 'blur' },
  ],
};

watch(
  () => form.unitPrice,
  (val) => {
    if (val > 0 && form.quantity > 0) {
      form.totalPrice = parseFloat((val * form.quantity).toFixed(2));
    }
  }
);

watch(
  () => form.quantity,
  (val) => {
    if (form.unitPrice > 0 && val > 0) {
      form.totalPrice = parseFloat((form.unitPrice * val).toFixed(2));
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
    await createStandaloneOrder({
      productName: form.productName,
      materialType: form.materialType,
      specifications: form.specifications,
      specialRequirements: form.specialRequirements || undefined,
      unitPrice: form.unitPrice,
      quantity: form.quantity,
      totalPrice: form.totalPrice,
    });
    ElMessage.success('订单创建成功');
    handleClose();
    emit('saved');
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '创建失败');
  } finally {
    saving.value = false;
  }
}
</script>
