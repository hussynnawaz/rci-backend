import mongoose from 'mongoose';

const orderFormSchema = new mongoose.Schema({
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  service: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  orderCity: {
    type: String,
    required: true,
    trim: true
  },
  orderState: {
    type: String,
    required: true,
    trim: true
  },
  orderAddress: {
    type: String,
    required: true,
    trim: true
  },
  deliveryCity: {
    type: String,
    required: true,
    trim: true
  },
  deliveryState: {
    type: String,
    required: true,
    trim: true
  },
  deliveryAddress: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  documents: {
    type: [String] // Array of file URLs
  }
}, {
  timestamps: true
});

const OrderForm = mongoose.model('OrderForm', orderFormSchema, 'orderforms');

export default OrderForm;

