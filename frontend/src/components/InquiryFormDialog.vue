<template>
  <el-dialog
    :model-value="visible"
    :title="isEditing ? $t('inquiries.edit') : $t('inquiries.create')"
    width="600px"
    @update:model-value="$emit('update:visible', $event)"
    @close="resetForm"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="120px"
    >
      <el-form-item
        :label="$t('inquiries.productName')"
        prop="productName"
      >
        <el-input
          v-model="formData.productName"
          :placeholder="$t('inquiries.productNamePlaceholder')"
          maxlength="100"
          show-word-limit
        />
      </el-form-item>

      <el-form-item
        :label="$t('inquiries.materialType')"
        prop="materialType"
      >
        <el-input
          v-model="formData.materialType"
          :placeholder="$t('inquiries.materialTypePlaceholder')"
          maxlength="50"
          show-word-limit
        />
      </el-form-item>

      <el-form-item
        :label="$t('inquiries.specifications')"
        prop="specifications"
      >
        <el-input
          v-model="formData.specifications"
          type="textarea"
          :placeholder="$t('inquiries.specificationsPlaceholder')"
          :rows="4"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>

      <el-form-item
        :label="$t('inquiries.quantity')"
        prop="quantity"
      >
        <el-input-number
          v-model="formData.quantity"
          :min="1"
          :max="999999"
          :precision="0"
          style="width: 200px"
        />
      </el-form-item>

      <el-form-item
        :label="$t('inquiries.specialRequirements')"
        prop="specialRequirements"
      >
        <el-input
          v-model="formData.specialRequirements"
          type="textarea"
          :placeholder="$t('inquiries.specialRequirementsPlaceholder')"
          :rows="3"
          maxlength="300"
          show-word-limit
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="$emit('update:visible', false)">
          {{ $t('common.cancel') }}
        </el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="handleSubmit"
        >
          {{ $t('common.save') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { useI18n } from 'vue-i18n';
import type { Inquiry, CreateInquiryForm, UpdateInquiryForm } from '@/types/inquiry';
import { InquiryService } from '@/services/inquiryService';

interface Props {
  visible: boolean;
  inquiry: Inquiry | null;
}

interface Emits {
  (e: 'update:visible', value: boolean): void;
  (e: 'success'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { t } = useI18n();

// Form state
const formRef = ref<FormInstance>();
const submitting = ref(false);

const formData = reactive({
  productName: '',
  materialType: '',
  specifications: '',
  quantity: 1,
  specialRequirements: '',
});

// Computed
const isEditing = computed(() => !!props.inquiry);

// Form validation rules
const formRules = computed<FormRules>(() => ({
  productName: [
    { required: true, message: t('inquiries.productNameRequired'), trigger: 'blur' },
    { min: 1, max: 100, message: t('inquiries.productNameLength'), trigger: 'blur' },
  ],
  materialType: [
    { required: true, message: t('inquiries.materialTypeRequired'), trigger: 'blur' },
    { min: 1, max: 50, message: t('inquiries.materialTypeLength'), trigger: 'blur' },
  ],
  specifications: [
    { required: true, message: t('inquiries.specificationsRequired'), trigger: 'blur' },
    { min: 1, max: 500, message: t('inquiries.specificationsLength'), trigger: 'blur' },
  ],
  quantity: [
    { required: true, message: t('inquiries.quantityRequired'), trigger: 'blur' },
    { type: 'number', min: 1, message: t('inquiries.quantityMin'), trigger: 'blur' },
  ],
  specialRequirements: [
    { max: 300, message: t('inquiries.specialRequirementsLength'), trigger: 'blur' },
  ],
}));

// Methods
const resetForm = () => {
  formData.productName = '';
  formData.materialType = '';
  formData.specifications = '';
  formData.quantity = 1;
  formData.specialRequirements = '';
  formRef.value?.resetFields();
};

const loadInquiryData = () => {
  if (props.inquiry) {
    formData.productName = props.inquiry.productName;
    formData.materialType = props.inquiry.materialType;
    formData.specifications = props.inquiry.specifications;
    formData.quantity = props.inquiry.quantity;
    formData.specialRequirements = props.inquiry.specialRequirements || '';
  }
};

const handleSubmit = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
    submitting.value = true;

    if (isEditing.value && props.inquiry) {
      // Update inquiry
      const updateData: UpdateInquiryForm = {
        productName: formData.productName.trim(),
        materialType: formData.materialType.trim(),
        specifications: formData.specifications.trim(),
        quantity: formData.quantity,
        specialRequirements: formData.specialRequirements.trim() || undefined,
      };

      await InquiryService.updateInquiry(props.inquiry.id, updateData);
      ElMessage.success(t('inquiries.updateSuccess'));
    } else {
      // Create inquiry
      const createData: CreateInquiryForm = {
        productName: formData.productName.trim(),
        materialType: formData.materialType.trim(),
        specifications: formData.specifications.trim(),
        quantity: formData.quantity,
        specialRequirements: formData.specialRequirements.trim() || undefined,
      };

      await InquiryService.createInquiry(createData);
      ElMessage.success(t('inquiries.createSuccess'));
    }

    emit('success');
  } catch (error: any) {
    const errorMessage = isEditing.value ? t('inquiries.updateError') : t('inquiries.createError');
    ElMessage.error(error.message || errorMessage);
  } finally {
    submitting.value = false;
  }
};

// Watch for inquiry prop changes
watch(
  () => props.inquiry,
  () => {
    if (props.visible) {
      if (props.inquiry) {
        loadInquiryData();
      } else {
        resetForm();
      }
    }
  },
  { immediate: true }
);

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      if (props.inquiry) {
        loadInquiryData();
      } else {
        resetForm();
      }
    }
  }
);
</script>

<style scoped>
.dialog-footer {
  text-align: right;
}
</style>