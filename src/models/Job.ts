import mongoose from 'mongoose';

const JobSchema = new mongoose.Schema({
  postingLink:    { type: String, required: true },
  title:          { type: String, required: true },
  company:        { type: String, required: true },
  appliedDate:    { type: Date, required: true },
  docsUsed:       { type: String },
  jobDescription: { type: String, default: '' },
  status:         { type: String, enum: ['Applied', 'Interview', 'Cancelled', 'Offer'], default: 'Applied' },
  user:           { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

export default mongoose.models.Job || mongoose.model('Job', JobSchema);
