const Mongoose = require('mongoose');
const Schema = Mongoose.Schema;

// sub-doc, no own _id needed
const ratingsSchema = new Schema({
    academics: { type: Number, default: 0 },
    faculty: { type: Number, default: 0 },
    placements: { type: Number, default: 0 },
    campus: { type: Number, default: 0 },
    hostel: { type: Number, default: 0 },
    sports: { type: Number, default: 0 }
}, { _id: false });

// Review sub-schema (gets its own _id and createdAt/updatedAt)
const reviewSchema = new Schema({
    instId: { type: String, trim: true, default: '' },
    rating: { type: Number, default: 5 },
    course: { type: String, trim: true, default: '' },
    branch: { type: String, trim: true, default: '' },
    batch: { type: String, trim: true, default: '' },
    exam: { type: String, trim: true, default: '' },
    rank: { type: String, trim: true, default: '' },
    score: { type: String, trim: true, default: '' },
    cgpa: { type: String, trim: true, default: '' },
    pros: { type: String, trim: true, default: '' },
    cons: { type: String, trim: true, default: '' },
    body: { type: String, trim: true, default: '' },
    author: { type: String, trim: true, default: 'Anonymous' },
    email: { type: String, trim: true, default: '' },
    contact: { type: String, trim: true, default: '' },
    helpful: { type: Number, default: 0 },
    flagged: { type: Boolean, default: false },
    hidden: { type: Boolean, default: false },
    reportReason: { type: String, trim: true, default: '' }
}, { timestamps: true });

// Cutoff sub-schema
const cutoffSchema = new Schema({
    instId: { type: String, trim: true, default: '' },
    year: { type: String, trim: true, default: '' },
    branch: { type: String, trim: true, default: '' },
    category: { type: String, trim: true, default: '' },
    exam: { type: String, trim: true, default: '' },
    openRank: { type: Number, default: null },
    closeRank: { type: Number, default: null },
    prevClose: { type: Number, default: null },
    percentile: { type: Number, default: null },
    openPct: { type: Number, default: null },
    prevPct: { type: Number, default: null }
}, { timestamps: true });

// Placement sub-schema
const placementSchema = new Schema({
    instId: { type: String, trim: true, default: '' },
    year: { type: String, trim: true, default: '' },
    branch: { type: String, trim: true, default: '' },
    course: { type: String, trim: true, default: '' },
    eligible: { type: Number, default: 0 },
    placed: { type: Number, default: 0 },
    highCTC: { type: String, trim: true, default: '' },
    avgCTC: { type: String, trim: true, default: '' },
    medCTC: { type: String, trim: true, default: '' },
    intlOffers: { type: Number, default: 0 },
    ppoOffers: { type: Number, default: 0 },
    topRecruiters: [{ trim: true, type: String }]
}, { timestamps: true });

const schema = new Mongoose.Schema({
    name: { type: String, trim: true },
    slug: { type: String, trim: true, default: '' },       // pretty-URL lookup, same idea as ArticleTitle.metaSlug
    type: { type: String, trim: true, default: '' },        // IIT / NIT / IIIT / Central / Private
    location: { type: String, trim: true, default: '' },
    nirf: { type: String, trim: true, default: '' },        // display string, e.g. "#3 (Engineering)"
    nirfNum: { type: Number, default: null },                // numeric rank, for sorting
    est: { type: String, trim: true, default: '' },
    fees: { type: String, trim: true, default: '' },
    size: { type: String, trim: true, default: '' },
    highestCTC: { type: String, trim: true, default: '' },
    avgCTC: { type: String, trim: true, default: '' },
    hostels: { type: String, trim: true, default: '' },
    students: { type: String, trim: true, default: '' },
    img: { type: String, trim: true, default: '' },
    about: { type: String, trim: true, default: '' },
    departments: [{ trim: true, type: String }],
    facilities: [{ trim: true, type: String }],
    ratings: { type: ratingsSchema, default: () => ({}) },

    // Embedded collections so no additional model imports are needed
    reviews: [reviewSchema],
    cutoffs: [cutoffSchema],
    placements: [placementSchema]

}, { timestamps: true });

module.exports = Mongoose.model('Institution', schema);