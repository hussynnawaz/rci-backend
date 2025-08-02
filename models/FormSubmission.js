import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  originalName: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  ftpPath: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

const formSubmissionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Personal Information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  company: {
    type: String,
    trim: true
  },
  
  // Service Details
  serviceType: {
    type: String,
    required: [true, 'Service type is required'],
    enum: [
      'business_cards',
      'flyers',
      'brochures',
      'banners',
      'letterheads',
      'envelopes',
      'labels',
      'custom_printing',
      'other'
    ]
  },
  
  // Print Specifications
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  paperType: {
    type: String,
    enum: ['standard', 'premium', 'glossy', 'matte', 'cardstock', 'other'],
    default: 'standard'
  },
  size: {
    type: String,
    enum: ['A4', 'A3', 'A5', 'letter', 'legal', 'custom'],
    default: 'A4'
  },
  customSize: {
    width: Number,
    height: Number,
    unit: {
      type: String,
      enum: ['mm', 'cm', 'inch'],
      default: 'mm'
    }
  },
  color: {
    type: String,
    enum: ['black_white', 'color', 'both'],
    default: 'color'
  },
  sides: {
    type: String,
    enum: ['single', 'double'],
    default: 'single'
  },
  
  // Additional Options
  finishing: [{
    type: String,
    enum: ['lamination', 'binding', 'cutting', 'folding', 'perforation', 'scoring']
  }],
  
  // Timeline
  urgency: {
    type: String,
    enum: ['standard', 'rush', 'same_day'],
    default: 'standard'
  },
  requestedDeliveryDate: {
    type: Date
  },
  
  // Special Instructions
  specialInstructions: {
    type: String,
    maxlength: [1000, 'Special instructions cannot exceed 1000 characters']
  },
  
  // Files
  files: [fileSchema],
  
  // Pricing
  estimatedCost: {
    type: Number,
    default: 0
  },
  finalCost: {
    type: Number
  },
  
  // Status
  status: {
    type: String,
    enum: [
      'pending',
      'quote_requested',
      'quote_provided',
      'approved',
      'in_production',
      'completed',
      'delivered',
      'cancelled'
    ],
    default: 'pending'
  },
  
  // Admin Notes
  adminNotes: [{
    note: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Timestamps
  submittedAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes for better performance
formSubmissionSchema.index({ user: 1 });
formSubmissionSchema.index({ status: 1 });
formSubmissionSchema.index({ serviceType: 1 });
formSubmissionSchema.index({ submittedAt: -1 });
formSubmissionSchema.index({ urgency: 1 });

// Update lastUpdated on save
formSubmissionSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Virtual for total file count
formSubmissionSchema.virtual('fileCount').get(function() {
  return this.files ? this.files.length : 0;
});

// Virtual for total file size
formSubmissionSchema.virtual('totalFileSize').get(function() {
  if (!this.files || this.files.length === 0) return 0;
  return this.files.reduce((total, file) => total + file.size, 0);
});

// Method to add admin note
formSubmissionSchema.methods.addAdminNote = function(note, adminId) {
  this.adminNotes.push({
    note,
    addedBy: adminId,
    addedAt: new Date()
  });
  return this.save();
};

// Method to update status
formSubmissionSchema.methods.updateStatus = function(newStatus, adminId = null, note = null) {
  this.status = newStatus;
  if (note && adminId) {
    this.adminNotes.push({
      note: `Status changed to ${newStatus}: ${note}`,
      addedBy: adminId,
      addedAt: new Date()
    });
  }
  return this.save();
};

// Ensure virtual fields are serialized
formSubmissionSchema.set('toJSON', { virtuals: true });
formSubmissionSchema.set('toObject', { virtuals: true });

const FormSubmission = mongoose.model('FormSubmission', formSubmissionSchema);

export default FormSubmission;
