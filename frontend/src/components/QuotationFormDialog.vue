<template>
  <el-dialog
    v-model="dialogVisible"
    :title="isEdit ? $t('quotations.editQuotation') : $t('quotations.createQuotation')"
    width="600px"
    :before-close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="120px"
      @submit.prevent="handleSubmit"
    >
      <el-form-item :label="$t('quotations.unitPrice')" prop="unitPrice">
        <el-input-number
          v-model="form.unitPrice"
          :placeholder="$t('quotations.unitPricePlaceholder')"
          :min="0"
          :precision="2"
          :step="0.01"
          style="width: 100%"
          @change="calculateTotalPrice"
        />
      </el-form-item>

      <el-form-item :label="$t('quotations.quantity')" prop="quantity">
        <el-input-number
          v-model="quantity"
          :placeholder="$t('quotations.quantityPlaceholder')"
          :min="1"
          :disabled="true"
          style="width: 100%"
        />
      </el-form-item>

      <el-form-item :label="$t('quotations.totalPrice')" prop="totalPrice">
        <el-input-number
          v-model="form.totalPrice"
          :placeholder="$t('quotations.totalPricePlaceholder')"
          :min="0"
          :precision="2"
          :step="0.01"
          style="width: 100%"
          @change="calculateUnitPrice"
        />
      </el-form-item>

      <el-form-item :label="$t('quotations.deliveryTime')" prop="deliveryTime">
        <el-input-number
          v-model="form.deliveryTime"
          :placeholder="$t('quotations.deliveryTimePlaceholder')"
          :min="1"
          :max="365"
          style="width: 100%"
        />
        <span class="form-help-text">{{ $t('quotations.deliveryTimeUnit') }}</span>
      </el-form-item>

      <el-form-item :label="$t('quotations.remarks')" prop="remarks">
        <el-input
          v-model="form.remarks"
          type="textarea"
          :placeholder="$t('quotations.remarksPlaceholder')"
          :rows="4"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">
          {{ $t('common.cancel') }}
        </el-button>
        <el-button 
          type="primary" 
          :loading="loading"
          @click="handleSubmit"
        >
          {{ $t('common.confirm') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { useI18n } from 'vue-i18n';
import type { CreateQuotationForm, UpdateQuotationForm, Quotation } from '@/types/quotation';
import type { Inquiry } from '@/types/inquiry';

interface Props {
  visible: boolean;
  inquiry: Inquiry | null;
  quotation?: Quotation | null;
}

interface Emits {
  (e: 'update:visible', value: boolean): void;
  (e: 'success'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { t } = useI18n();

// Form reference
const formRef = ref<FormInstance>();

// Dialog visibility
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
});

// Loading state
const loading = ref(false);

// Check if editing existing quotation
const isEdit = computed(() => !!props.quotation);

// Inquiry quantity for calculation
const quantity = computed(() => props.inquiry?.quantity || 1);

// Form data
const form = reactive<CreateQuotationForm | UpdateQuotationForm>({
  inquiryId: '',
  unitPrice: 0,
  totalPrice: 0,
  deliveryTime: 7,
  remarks: ''
});

// Form validation rules
const rules: FormRules = {
  unitPrice: [
    { required: true, message: t('quotations.validation.unitPriceRequired'), trigger: 'blur' },
    { type: 'number', min: 0.01, message: t('quotations.validation.unitPriceMin'), trigger: 'blur' }
  ],
  totalPrice: [
    { required: true, message: t('quotations.validation.totalPriceRequired'), trigger: 'blur' },
    { type: 'number', min: 0.01, message: t('quotations.validation.totalPriceMin'), trigger: 'blur' }
  ],
  deliveryTime: [
    { required: true, message: t('quotations.validation.deliveryTimeRequired'), trigger: 'blur' },
    { type: 'number', min: 1, max: 365, message: t('quotations.validation.deliveryTimeRange'), trigger: 'blur' }
  ]
};

// Calculate total price when unit price changes
const calculateTotalPrice = () => {
  if (form.unitPrice && quantity.value) {
    form.totalPrice = Number((form.unitPrice * quantity.value).toFixed(2));
  }
};

// Calculate unit price when total price changes
const calculateUnitPrice = () => {
  if (form.totalPrice && quantity.value) {
    form.unitPrice = Number((form.totalPrice / quantity.value).toFixed(2));
  }
};

// Initialize form when dialog opens
watch([() => props.visible, () => props.inquiry, () => props.quotation], () => {
  if (props.visible && props.inquiry) {
    resetForm();
    
    if (props.quotation) {
      // Edit mode - populate form with existing quotation data
      Object.assign(form, {
        unitPrice: props.quotation.unitPrice,
        totalPrice: props.quotation.totalPrice,
        deliveryTime: props.quotation.deliveryTime,
        remarks: props.quotation.remarks || ''
      });
    } else {
      // Create mode - set inquiry ID
      form.inquiryId = props.inquiry.id;
    }
  }
});

// Reset form
const resetForm = () => {
  Object.assign(form, {
    inquiryId: '',
    unitPrice: 0,
    totalPrice: 0,
    deliveryTime: 7,
    remarks: ''
  });
  formRef.value?.clearValidate();
};

// Handle form submission
const handleSubmit = async () => {
  if (!formRef.value) return;

  try {
    const valid = await formRef.value.validate();
    if (!valid) return;

    loading.value = true;

    // Emit success event to parent component
    emit('success');
    
    ElMessage.success(
      isEdit.value 
        ? t('quotations.updateSuccess') 
        : t('quotations.createSuccess')
    );
    
    handleClose();
  } catch (error: any) {
    console.error('Form submission error:', error);
    ElMessage.error(
      error.message || 
      (isEdit.value 
        ? t('quotations.updateError') 
        : t('quotations.createError'))
    );
  } finally {
    loading.value = false;
  }
};

// Handle dialog close
const handleClose = () => {
  resetForm();
  dialogVisible.value = false;
};

// Expose form data for parent component
defineExpose({
  form
});
</script>

<style scoped>
.form-help-text {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  margin-left: 8px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>