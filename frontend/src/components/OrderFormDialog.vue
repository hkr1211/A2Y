<template>
  <el-dialog
    v-model="dialogVisible"
    :title="isEdit ? $t('orders.edit') : $t('orders.create')"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="120px"
      @submit.prevent="handleSubmit"
    >
      <el-form-item :label="$t('orders.productName')" prop="productName">
        <el-input
          v-model="formData.productName"
          :placeholder="$t('orders.productNamePlaceholder')"
          maxlength="100"
          show-word-limit
        />
      </el-form-item>

      <el-form-item :label="$t('orders.materialType')" prop="materialType">
        <el-input
          v-model="formData.materialType"
          :placeholder="$t('orders.materialTypePlaceholder')"
          maxlength="50"
          show-word-limit
        />
      </el-form-item>

      <el-form-item :label="$t('orders.specifications')" prop="specifications">
        <el-input
          v-model="formData.specifications"
          type="textarea"
          :rows="4"
          :placeholder="$t('orders.specificationsPlaceholder')"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>

      <el-form-item :label="$t('orders.specialRequirements')">
        <el-input
          v-model="formData.specialRequirements"
          type="textarea"
          :rows="3"
          :placeholder="$t('orders.specialRequirementsPlaceholder')"
          maxlength="300"
          show-word-limit
        />
      </el-form-item>

      <el-row :gutter="20">
        <el-col :span="8">
          <el-form-item :label="$t('orders.quantity')" prop="quantity">
            <el-input-number
              v-model="formData.quantity"
              :min="1"
              :max="999999"
              controls-position="right"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item :label="$t('orders.unitPrice')" prop="unitPrice">
            <el-input-number
              v-model="formData.unitPrice"
              :min="0.01"
              :precision="2"
              controls-position="right"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item :label="$t('orders.totalPrice')" prop="totalPrice">
            <el-input-number
              v-model="formData.totalPrice"
              :min="0.01"
              :precision="2"
              controls-position="right"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
      </el-row>
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
          {{ $t('common.save') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { useI18n } from 'vue-i18n';
import type { Order, CreateOrderForm, UpdateOrderForm } from '@/types/order';
import { OrderService } from '@/services/orderService';

interface Props {
  visible: boolean;
  order: Order | null;
}

interface Emits {
  (e: 'update:visible', visible: boolean): void;
  (e: 'success'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { t } = useI18n();

// State
const loading = ref(false);
const formRef = ref<FormInstance>();

// Computed
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
});

const isEdit = computed(() => !!props.order);

// Form data
const defaultFormData = (): CreateOrderForm => ({
  productName: '',
  materialType: '',
  specifications: '',
  specialRequirements: '',
  quantity: 1,
  unitPrice: 0,
  totalPrice: 0,
});

const formData = ref<CreateOrderForm>(defaultFormData());

// Form rules
const formRules: FormRules = {
  productName: [
    { required: true, message: t('orders.productNameRequired'), trigger: 'blur' },
    { min: 1, max: 100, message: t('orders.productNameLength'), trigger: 'blur' },
  ],
  materialType: [
    { required: true, message: t('orders.materialTypeRequired'), trigger: 'blur' },
    { min: 1, max: 50, message: t('orders.materialTypeLength'), trigger: 'blur' },
  ],
  specifications: [
    { required: true, message: t('orders.specificationsRequired'), trigger: 'blur' },
    { min: 1, max: 500, message: t('orders.specificationsLength'), trigger: 'blur' },
  ],
  quantity: [
    { required: true, message: t('orders.quantityRequired'), trigger: 'blur' },
    { type: 'number', min: 1, message: t('orders.quantityMin'), trigger: 'blur' },
  ],
  unitPrice: [
    { required: true, message: t('orders.unitPriceRequired'), trigger: 'blur' },
    { type: 'number', min: 0.01, message: t('orders.unitPriceMin'), trigger: 'blur' },
  ],
  totalPrice: [
    { required: true, message: t('orders.totalPriceRequired'), trigger: 'blur' },
    { type: 'number', min: 0.01, message: t('orders.totalPriceMin'), trigger: 'blur' },
  ],
};

// Methods
const resetForm = () => {
  formData.value = defaultFormData();
  nextTick(() => {
    formRef.value?.clearValidate();
  });
};

const loadOrderData = () => {
  if (props.order) {
    formData.value = {
      productName: props.order.productName,
      materialType: props.order.materialType,
      specifications: props.order.specifications,
      specialRequirements: props.order.specialRequirements || '',
      quantity: props.order.quantity,
      unitPrice: props.order.unitPrice,
      totalPrice: props.order.totalPrice,
    };
  } else {
    resetForm();
  }
};

const handleSubmit = async () => {
  if (!formRef.value) return;

  try {
    const valid = await formRef.value.validate();
    if (!valid) return;

    loading.value = true;

    if (isEdit.value && props.order) {
      const updateData: UpdateOrderForm = {
        productName: formData.value.productName,
        materialType: formData.value.materialType,
        specifications: formData.value.specifications,
        specialRequirements: formData.value.specialRequirements,
        quantity: formData.value.quantity,
        unitPrice: formData.value.unitPrice,
        totalPrice: formData.value.totalPrice,
      };
      await OrderService.updateOrder(props.order.id, updateData);
      ElMessage.success(t('orders.updateSuccess'));
    } else {
      await OrderService.createOrder(formData.value);
      ElMessage.success(t('orders.createSuccess'));
    }

    emit('success');
  } catch (error: any) {
    ElMessage.error(error.message || t('errors.serverError'));
  } finally {
    loading.value = false;
  }
};

const handleClose = () => {
  dialogVisible.value = false;
};

// Watch for dialog visibility changes
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      loadOrderData();
    }
  },
  { immediate: true }
);

// Watch for quantity and unit price changes to auto-calculate total price
watch(
  [() => formData.value.quantity, () => formData.value.unitPrice],
  ([quantity, unitPrice]) => {
    if (quantity > 0 && unitPrice > 0) {
      formData.value.totalPrice = Number((quantity * unitPrice).toFixed(2));
    }
  }
);
</script>

<style scoped>
.dialog-footer {
  text-align: right;
}
</style>