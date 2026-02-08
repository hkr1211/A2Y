<template>
  <el-dialog
    :model-value="visible"
    :title="inquiry ? $t('inquiry.edit') : $t('inquiry.create')"
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
      <el-form-item :label="$t('inquiry.materialType')" prop="materialType">
        <el-input v-model="form.materialType" />
      </el-form-item>
      <el-form-item
        :label="$t('inquiry.specifications')"
        prop="specifications"
      >
        <el-input
          v-model="form.specifications"
          type="textarea"
          :rows="3"
        />
      </el-form-item>
      <el-form-item :label="$t('inquiry.quantity')" prop="quantity">
        <el-input-number v-model="form.quantity" :min="1" />
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
import { createInquiry, updateInquiry } from '@/services/inquiry';
import type { Inquiry } from '@/types';

const props = defineProps<{
  visible: boolean;
  inquiry: Inquiry | null;
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
  quantity: 1,
});

const rules: FormRules = {
  productName: [{ required: true, message: '请输入产品名称', trigger: 'blur' }],
  materialType: [
    { required: true, message: '请输入材质类型', trigger: 'blur' },
  ],
  specifications: [
    { required: true, message: '请输入规格说明', trigger: 'blur' },
  ],
  quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }],
};

watch(
  () => props.visible,
  (val) => {
    if (val && props.inquiry) {
      form.productName = props.inquiry.productName;
      form.materialType = props.inquiry.materialType;
      form.specifications = props.inquiry.specifications;
      form.specialRequirements = props.inquiry.specialRequirements || '';
      form.quantity = props.inquiry.quantity;
    } else if (val) {
      form.productName = '';
      form.materialType = '';
      form.specifications = '';
      form.specialRequirements = '';
      form.quantity = 1;
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
    if (props.inquiry) {
      await updateInquiry(props.inquiry.id, {
        productName: form.productName,
        materialType: form.materialType,
        specifications: form.specifications,
        specialRequirements: form.specialRequirements || null,
        quantity: form.quantity,
      });
    } else {
      await createInquiry({
        productName: form.productName,
        materialType: form.materialType,
        specifications: form.specifications,
        specialRequirements: form.specialRequirements || undefined,
        quantity: form.quantity,
      });
    }
    ElMessage.success('操作成功');
    handleClose();
    emit('saved');
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '操作失败');
  } finally {
    saving.value = false;
  }
}
</script>
