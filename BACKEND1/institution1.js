const express = require('express');
const router = express.Router();
const aeh = require('../middleware/asyncErrorHandler');
const Institution = require('../db/models/Institution');
const authenticateJWT = require('../middleware/jwtAuth');
const ObjectId = require('mongoose').Types.ObjectId;

// shared admin check, same condition your /remove/:id route uses
function isAdmin(req) {
    return req.user && (req.user.role == 'superAdmin' || req.user.role == 'admin');
}

// safely handles both Array ["CSE", "ECE"] and comma-separated String "CSE, ECE"
function toArray(val) {
    if (!val || !val.length) return [];
    if (Array.isArray(val)) return val.map(s => String(s).trim()).filter(Boolean);
    return typeof val === 'string' && val.includes(',')
        ? val.split(',').map(s => s.trim()).filter(Boolean)
        : [String(val).trim()];
}

//=================API to list / get one Institution==================//
router.get('/', aeh(async function (req, res) {
    try {
        let { id, slug, type, search, sort } = req.query
        let where = {}
        if (id && id.length) { where = { _id: id } }
        if (slug && slug.length) { where = { slug: slug } }
        if (type && type.length) { where.type = type }
        if (search && search.length) {
            where.$or = [
                { name: { $regex: search, $options: 'i' } },
                { location: { $regex: search, $options: 'i' } }
            ]
        }

        let sortBy = { createdAt: -1 }
        if (sort === 'name') sortBy = { name: 1 }
        if (sort === 'rating') sortBy = { 'ratings.academics': -1 }

        const List = await Institution.find(where).select('-reviews -cutoffs -placements').sort(sortBy)
        return res.success("Found Successfully", List);
    }
    catch (error) {
        console.log(error)
        return res.error(error.message)
    }
}));

//=================API to create Institution==================//
router.post('/create', authenticateJWT, aeh(async function (req, res) {
    try {
        if (!isAdmin(req)) return res.sendStatus(401);

        let { name, slug, type, location, nirf, nirfNum, est, fees, size,
            highestCTC, avgCTC, hostels, students, img, about, departments, facilities, ratings } = req.body

        if (!name) {
            return res.status(201).success("Please pass name in body!");
        }
        departments = toArray(departments)
        facilities = toArray(facilities)

        const created = await Institution.create({
            name, slug, type, location, nirf, nirfNum, est, fees, size,
            highestCTC, avgCTC, hostels, students, img, about, departments, facilities, ratings
        })
        return res.success("Create Successfully", created);
    }
    catch (error) {
        console.log(error)
        return res.error(error.message)
    }
}));

//=================API to update Institution==================//
router.put('/update', authenticateJWT, aeh(async function (req, res) {
    try {
        if (!isAdmin(req)) return res.sendStatus(401);

        let { id, name, slug, type, location, nirf, nirfNum, est, fees, size,
            highestCTC, avgCTC, hostels, students, img, about, departments, facilities, ratings } = req.body

        if (!name || !id) {
            return res.status(201).success("Please pass name, id in body!");
        }
        if (!ObjectId.isValid(id)) return res.status(201).error("Not a valid id")

        departments = toArray(departments)
        facilities = toArray(facilities)

        await Institution.updateOne({ _id: id }, {
            name, slug, type, location, nirf, nirfNum, est, fees, size,
            highestCTC, avgCTC, hostels, students, img, about, departments, facilities, ratings
        })
        return res.success("Updated Successfully");
    }
    catch (error) {
        console.log(error)
        return res.error(error.message)
    }
}));

//=================API to delete Institution==================//
router.put('/remove/:id', authenticateJWT, aeh(async function (req, res) {
    try {
        if (!isAdmin(req)) return res.sendStatus(401);
        const { id } = req.params
        if (!ObjectId.isValid(id)) return res.status(201).error("Not a valid id")
        if (!id) {
            return res.status(201).success("Please pass id in params");
        }
        await Institution.deleteOne({ _id: id })
        return res.success("Deleted Successfully");
    }
    catch (error) {
        console.log(error)
        return res.error(error.message)
    }
}));

//=================API to update Institution image==================//
router.put('/image', authenticateJWT, aeh(async function (req, res) {
    try {
        if (!isAdmin(req)) return res.sendStatus(401);
        let { id, img } = req.body
        if (!id || !img) return res.status(201).success("Please pass id, img in body!");
        if (!ObjectId.isValid(id)) return res.status(201).error("Not a valid id")

        await Institution.updateOne({ _id: id }, { img })
        return res.success("Image Updated Successfully");
    }
    catch (error) {
        console.log(error)
        return res.error(error.message)
    }
}));

//=================API to add a department==================//
router.put('/department/add', authenticateJWT, aeh(async function (req, res) {
    try {
        if (!isAdmin(req)) return res.sendStatus(401);
        let { id, name } = req.body
        if (!id || !name) return res.status(201).success("Please pass id, name in body!");
        if (!ObjectId.isValid(id)) return res.status(201).error("Not a valid id")

        await Institution.updateOne({ _id: id }, { $addToSet: { departments: name } })
        return res.success("Department Added Successfully");
    }
    catch (error) {
        console.log(error)
        return res.error(error.message)
    }
}));

//=================API to remove a department==================//
router.put('/department/remove', authenticateJWT, aeh(async function (req, res) {
    try {
        if (!isAdmin(req)) return res.sendStatus(401);
        let { id, name } = req.body
        if (!id || !name) return res.status(201).success("Please pass id, name in body!");
        if (!ObjectId.isValid(id)) return res.status(201).error("Not a valid id")

        await Institution.updateOne({ _id: id }, { $pull: { departments: name } })
        return res.success("Department Removed Successfully");
    }
    catch (error) {
        console.log(error)
        return res.error(error.message)
    }
}));

//=================API to add a facility==================//
router.put('/facility/add', authenticateJWT, aeh(async function (req, res) {
    try {
        if (!isAdmin(req)) return res.sendStatus(401);
        let { id, name } = req.body
        if (!id || !name) return res.status(201).success("Please pass id, name in body!");
        if (!ObjectId.isValid(id)) return res.status(201).error("Not a valid id")

        await Institution.updateOne({ _id: id }, { $addToSet: { facilities: name } })
        return res.success("Facility Added Successfully");
    }
    catch (error) {
        console.log(error)
        return res.error(error.message)
    }
}));

//=================API to remove a facility==================//
router.put('/facility/remove', authenticateJWT, aeh(async function (req, res) {
    try {
        if (!isAdmin(req)) return res.sendStatus(401);
        let { id, name } = req.body
        if (!id || !name) return res.status(201).success("Please pass id, name in body!");
        if (!ObjectId.isValid(id)) return res.status(201).error("Not a valid id")

        await Institution.updateOne({ _id: id }, { $pull: { facilities: name } })
        return res.success("Facility Removed Successfully");
    }
    catch (error) {
        console.log(error)
        return res.error(error.message)
    }
}));


/* ========================================================================
   REVIEWS APIs
   ======================================================================== */

//=================API to list all Reviews==================//
router.get('/review', aeh(async function (req, res) {
    try {
        let { instId, branch, exam, sort } = req.query
        let where = {}
        if (instId && instId.length) {
            if (!ObjectId.isValid(instId)) return res.status(201).error("Not a valid instId")
            where._id = instId
        }

        const insts = await Institution.find(where).select('reviews')
        let List = []
        insts.forEach(inst => {
            (inst.reviews || []).forEach(r => {
                if (!r.hidden) {
                    const obj = r.toObject()
                    obj.instId = String(inst._id)
                    delete obj.email
                    delete obj.contact
                    delete obj.reportReason
                    List.push(obj)
                }
            })
        })

        if (branch && branch.length && branch !== 'All') {
            List = List.filter(r => r.branch === branch)
        }
        if (exam && exam.length && exam !== 'All') {
            List = List.filter(r => r.exam === exam)
        }

        if (sort === 'highest') List.sort((a, b) => b.rating - a.rating)
        else if (sort === 'lowest') List.sort((a, b) => a.rating - b.rating)
        else if (sort === 'helpful') List.sort((a, b) => (b.helpful || 0) - (a.helpful || 0))
        else List.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

        return res.success("Found Successfully", List);
    }
    catch (error) {
        console.log(error)
        return res.error(error.message)
    }
}));

//=================API to create a Review==================//
router.post('/review/create', aeh(async function (req, res) {
    try {
        let { instId, rating, course, branch, batch, exam, rank, score, cgpa,
            pros, cons, body, author, email, contact } = req.body

        if (!instId || !rating || !pros || !body) {
            return res.status(201).success("Please pass instId, rating, pros, body in body!");
        }
        if (!ObjectId.isValid(instId)) return res.status(201).error("Not a valid instId")

        const inst = await Institution.findById(instId)
        if (!inst) return res.status(201).error("Institution not found")

        const newRev = {
            instId: String(instId),
            rating: Number(rating) || 5,
            course, branch, batch, exam,
            rank: rank ? String(rank) : '',
            score, cgpa, pros, cons, body,
            author: author && author.trim() ? author.trim() : 'Anonymous',
            email, contact,
            helpful: 0
        }

        inst.reviews.unshift(newRev)
        await inst.save()

        const created = inst.reviews[0].toObject()
        delete created.email
        delete created.contact
        delete created.reportReason

        return res.success("Create Successfully", created);
    }
    catch (error) {
        console.log(error)
        return res.error(error.message)
    }
}));

//=================API to mark a Review helpful==================//
router.put('/review/helpful', aeh(async function (req, res) {
    try {
        let { id } = req.body
        if (!id) return res.status(201).success("Please pass id in body!");
        if (!ObjectId.isValid(id)) return res.status(201).error("Not a valid id")

        await Institution.updateOne(
            { 'reviews._id': id },
            { $inc: { 'reviews.$.helpful': 1 } }
        )
        return res.success("Marked Helpful");
    }
    catch (error) {
        console.log(error)
        return res.error(error.message)
    }
}));

//=================API to report a Review==================//
router.put('/review/report', aeh(async function (req, res) {
    try {
        let { id, reason } = req.body
        if (!id) return res.status(201).success("Please pass id in body!");
        if (!ObjectId.isValid(id)) return res.status(201).error("Not a valid id")

        await Institution.updateOne(
            { 'reviews._id': id },
            { $set: { 'reviews.$.flagged': true, 'reviews.$.reportReason': reason || '' } }
        )
        return res.success("Reported Successfully");
    }
    catch (error) {
        console.log(error)
        return res.error(error.message)
    }
}));

//=================API to update a Review (Admin)==================//
router.put('/review/update', authenticateJWT, aeh(async function (req, res) {
    try {
        if (!isAdmin(req)) return res.sendStatus(401);
        let { id, rating, course, branch, batch, exam, rank, score, cgpa,
            pros, cons, body, author, hidden, flagged } = req.body

        if (!id) return res.status(201).success("Please pass id in body!");
        if (!ObjectId.isValid(id)) return res.status(201).error("Not a valid id")

        await Institution.updateOne(
            { 'reviews._id': id },
            {
                $set: {
                    'reviews.$.rating': rating,
                    'reviews.$.course': course,
                    'reviews.$.branch': branch,
                    'reviews.$.batch': batch,
                    'reviews.$.exam': exam,
                    'reviews.$.rank': rank,
                    'reviews.$.score': score,
                    'reviews.$.cgpa': cgpa,
                    'reviews.$.pros': pros,
                    'reviews.$.cons': cons,
                    'reviews.$.body': body,
                    'reviews.$.author': author,
                    'reviews.$.hidden': Boolean(hidden),
                    'reviews.$.flagged': Boolean(flagged)
                }
            }
        )
        return res.success("Updated Successfully");
    }
    catch (error) {
        console.log(error)
        return res.error(error.message)
    }
}));

//=================API to delete a Review (Admin)==================//
router.put('/review/remove/:id', authenticateJWT, aeh(async function (req, res) {
    try {
        if (!isAdmin(req)) return res.sendStatus(401);
        const { id } = req.params
        if (!ObjectId.isValid(id)) return res.status(201).error("Not a valid id")

        await Institution.updateOne(
            { 'reviews._id': id },
            { $pull: { reviews: { _id: id } } }
        )
        return res.success("Deleted Successfully");
    }
    catch (error) {
        console.log(error)
        return res.error(error.message)
    }
}));

//=================API to list all Reviews with Email & Contact (Admin)==================//
router.get('/review/admin', authenticateJWT, aeh(async function (req, res) {
    try {
        if (!isAdmin(req)) return res.sendStatus(401);

        let { instId, flagged } = req.query
        let where = {}
        if (instId && instId.length) {
            if (!ObjectId.isValid(instId)) return res.status(201).error("Not a valid instId")
            where._id = instId
        }

        const insts = await Institution.find(where).select('reviews')
        let List = []
        insts.forEach(inst => {
            (inst.reviews || []).forEach(r => {
                const obj = r.toObject()
                obj.instId = String(inst._id)
                // Keeps email, contact, flagged, hidden, and reportReason intact for Admin
                List.push(obj)
            })
        })

        if (flagged === 'true') {
            List = List.filter(r => r.flagged === true)
        }

        List.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        return res.success("Found Successfully", List);
    }
    catch (error) {
        console.log(error)
        return res.error(error.message)
    }
}));

/* ========================================================================
   PLACEMENTS APIs
   ======================================================================== */

//=================API to list all Placements==================//
router.get('/placement', aeh(async function (req, res) {
    try {
        let { instId, year, branch, course } = req.query
        let where = {}
        if (instId && instId.length) {
            if (!ObjectId.isValid(instId)) return res.status(201).error("Not a valid instId")
            where._id = instId
        }

        const insts = await Institution.find(where).select('placements')
        let List = []
        insts.forEach(inst => {
            (inst.placements || []).forEach(p => {
                const obj = p.toObject()
                obj.instId = String(inst._id)
                List.push(obj)
            })
        })

        if (year && year.length && year !== 'All') List = List.filter(p => String(p.year) === String(year))
        if (branch && branch.length && branch !== 'All') List = List.filter(p => p.branch === branch)
        if (course && course.length && course !== 'All') List = List.filter(p => p.course === course)

        List.sort((a, b) => Number(b.year || 0) - Number(a.year || 0))
        return res.success("Found Successfully", List);
    }
    catch (error) {
        console.log(error)
        return res.error(error.message)
    }
}));

//=================API to create a Placement row (Admin)==================//
router.post('/placement/create', authenticateJWT, aeh(async function (req, res) {
    try {
        if (!isAdmin(req)) return res.sendStatus(401);
        let { instId, year, branch, course, eligible, placed, highCTC, avgCTC, medCTC, intlOffers, ppoOffers, topRecruiters } = req.body

        if (!instId || !year || !branch) {
            return res.status(201).success("Please pass instId, year, branch in body!");
        }
        if (!ObjectId.isValid(instId)) return res.status(201).error("Not a valid instId")

        const inst = await Institution.findById(instId)
        if (!inst) return res.status(201).error("Institution not found")

        topRecruiters = toArray(topRecruiters)

        inst.placements.unshift({
            instId: String(instId),
            year: String(year),
            branch,
            course: course || 'B.Tech',
            eligible: Number(eligible) || 0,
            placed: Number(placed) || 0,
            highCTC, avgCTC, medCTC,
            intlOffers: Number(intlOffers) || 0,
            ppoOffers: Number(ppoOffers) || 0,
            topRecruiters
        })
        await inst.save()

        return res.success("Create Successfully", inst.placements[0]);
    }
    catch (error) {
        console.log(error)
        return res.error(error.message)
    }
}));

//=================API to update a Placement row (Admin)==================//
router.put('/placement/update', authenticateJWT, aeh(async function (req, res) {
    try {
        if (!isAdmin(req)) return res.sendStatus(401);
        let { id, year, branch, course, eligible, placed, highCTC, avgCTC, medCTC, intlOffers, ppoOffers, topRecruiters } = req.body

        if (!id) return res.status(201).success("Please pass id in body!");
        if (!ObjectId.isValid(id)) return res.status(201).error("Not a valid id")

        topRecruiters = toArray(topRecruiters)

        await Institution.updateOne(
            { 'placements._id': id },
            {
                $set: {
                    'placements.$.year': String(year),
                    'placements.$.branch': branch,
                    'placements.$.course': course,
                    'placements.$.eligible': Number(eligible) || 0,
                    'placements.$.placed': Number(placed) || 0,
                    'placements.$.highCTC': highCTC,
                    'placements.$.avgCTC': avgCTC,
                    'placements.$.medCTC': medCTC,
                    'placements.$.intlOffers': Number(intlOffers) || 0,
                    'placements.$.ppoOffers': Number(ppoOffers) || 0,
                    'placements.$.topRecruiters': topRecruiters
                }
            }
        )
        return res.success("Updated Successfully");
    }
    catch (error) {
        console.log(error)
        return res.error(error.message)
    }
}));

//=================API to delete a Placement row (Admin)==================//
router.put('/placement/remove/:id', authenticateJWT, aeh(async function (req, res) {
    try {
        if (!isAdmin(req)) return res.sendStatus(401);
        const { id } = req.params
        if (!ObjectId.isValid(id)) return res.status(201).error("Not a valid id")

        await Institution.updateOne(
            { 'placements._id': id },
            { $pull: { placements: { _id: id } } }
        )
        return res.success("Deleted Successfully");
    }
    catch (error) {
        console.log(error)
        return res.error(error.message)
    }
}));


/* ========================================================================
   CUTOFFS APIs
   ======================================================================== */

//=================API to list all Cutoffs==================//
router.get('/cutoff', aeh(async function (req, res) {
    try {
        let { instId, year, branch, category, exam } = req.query
        let where = {}
        if (instId && instId.length) {
            if (!ObjectId.isValid(instId)) return res.status(201).error("Not a valid instId")
            where._id = instId
        }

        const insts = await Institution.find(where).select('cutoffs')
        let List = []
        insts.forEach(inst => {
            (inst.cutoffs || []).forEach(c => {
                const obj = c.toObject()
                obj.instId = String(inst._id)
                List.push(obj)
            })
        })

        if (year && year.length && year !== 'All') List = List.filter(c => String(c.year) === String(year))
        if (branch && branch.length && branch !== 'All') List = List.filter(c => c.branch === branch)
        if (category && category.length && category !== 'All') List = List.filter(c => c.category === category)
        if (exam && exam.length && exam !== 'All') List = List.filter(c => c.exam === exam)

        List.sort((a, b) => Number(b.year || 0) - Number(a.year || 0) || (a.closeRank || 999999) - (b.closeRank || 999999))
        return res.success("Found Successfully", List);
    }
    catch (error) {
        console.log(error)
        return res.error(error.message)
    }
}));

//=================API to create a Cutoff row (Admin)==================//
router.post('/cutoff/create', authenticateJWT, aeh(async function (req, res) {
    try {
        if (!isAdmin(req)) return res.sendStatus(401);
        let { instId, year, branch, category, exam, openRank, closeRank, prevClose, percentile, openPct, prevPct } = req.body

        if (!instId || !year || !branch) {
            return res.status(201).success("Please pass instId, year, branch in body!");
        }
        if (!ObjectId.isValid(instId)) return res.status(201).error("Not a valid instId")

        const inst = await Institution.findById(instId)
        if (!inst) return res.status(201).error("Institution not found")

        inst.cutoffs.unshift({
            instId: String(instId),
            year: String(year),
            branch,
            category: category || 'GEN',
            exam: exam || 'JEE Advanced',
            openRank: openRank ? Number(openRank) : null,
            closeRank: closeRank ? Number(closeRank) : null,
            prevClose: prevClose ? Number(prevClose) : null,
            percentile: percentile ? Number(percentile) : null,
            openPct: openPct ? Number(openPct) : null,
            prevPct: prevPct ? Number(prevPct) : null
        })
        await inst.save()

        return res.success("Create Successfully", inst.cutoffs[0]);
    }
    catch (error) {
        console.log(error)
        return res.error(error.message)
    }
}));

//=================API to update a Cutoff row (Admin)==================//
router.put('/cutoff/update', authenticateJWT, aeh(async function (req, res) {
    try {
        if (!isAdmin(req)) return res.sendStatus(401);
        let { id, year, branch, category, exam, openRank, closeRank, prevClose, percentile, openPct, prevPct } = req.body

        if (!id) return res.status(201).success("Please pass id in body!");
        if (!ObjectId.isValid(id)) return res.status(201).error("Not a valid id")

        await Institution.updateOne(
            { 'cutoffs._id': id },
            {
                $set: {
                    'cutoffs.$.year': String(year),
                    'cutoffs.$.branch': branch,
                    'cutoffs.$.category': category,
                    'cutoffs.$.exam': exam,
                    'cutoffs.$.openRank': openRank ? Number(openRank) : null,
                    'cutoffs.$.closeRank': closeRank ? Number(closeRank) : null,
                    'cutoffs.$.prevClose': prevClose ? Number(prevClose) : null,
                    'cutoffs.$.percentile': percentile ? Number(percentile) : null,
                    'cutoffs.$.openPct': openPct ? Number(openPct) : null,
                    'cutoffs.$.prevPct': prevPct ? Number(prevPct) : null
                }
            }
        )
        return res.success("Updated Successfully");
    }
    catch (error) {
        console.log(error)
        return res.error(error.message)
    }
}));

//=================API to delete a Cutoff row (Admin)==================//
router.put('/cutoff/remove/:id', authenticateJWT, aeh(async function (req, res) {
    try {
        if (!isAdmin(req)) return res.sendStatus(401);
        const { id } = req.params
        if (!ObjectId.isValid(id)) return res.status(201).error("Not a valid id")

        await Institution.updateOne(
            { 'cutoffs._id': id },
            { $pull: { cutoffs: { _id: id } } }
        )
        return res.success("Deleted Successfully");
    }
    catch (error) {
        console.log(error)
        return res.error(error.message)
    }
}));

module.exports = router;