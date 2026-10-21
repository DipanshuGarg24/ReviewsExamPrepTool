# backend.py
import os
import uuid
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

BASE = "/api/institutions"
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def gen_id():
    return uuid.uuid4().hex[:24]

# ================= DEDICATED IMAGE UPLOAD API (MIMICS EXTERNAL MEDIA SERVER) =================
@app.route("/api/upload", methods=["POST"])
@app.route(f"{BASE}/upload", methods=["POST"])
def upload_image_file():
    # Accepts 'file' or 'image' field in multipart/form-data
    file = request.files.get("file") or request.files.get("image")
    if not file or file.filename == "":
        return jsonify({"success": False, "message": "No image file provided"}), 400

    ext = os.path.splitext(secure_filename(file.filename))[1] or ".jpg"
    filename = f"img_{uuid.uuid4().hex[:12]}{ext}"
    save_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(save_path)

    file_url = f"http://127.0.0.1:5000/uploads/{filename}"
    return jsonify({
        "success": True,
        "message": "Image uploaded successfully",
        "url": file_url,
        "img": file_url,
        "data": {"url": file_url}
    })

@app.route("/uploads/<path:filename>", methods=["GET"])
def serve_uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)


# ================= INITIAL SEED DATA =================
USERS = [
    {"id": "u_admin_1", "name": "Super Admin", "email": "admin@campusfile.in", "password": "admin", "role": "superAdmin"},
    {"id": "u_stud_1", "name": "Rahul Sharma", "email": "rahul@iitb.ac.in", "password": "user", "role": "student"},
]

INSTITUTIONS = [
    {
        "_id": "inst_iitb_1",
        "name": "IIT Bombay",
        "slug": "iit-bombay",
        "type": "IIT",
        "location": "Mumbai, Maharashtra",
        "nirf": "#3 Engineering",
        "nirfNum": 3,
        "est": 1958,
        "fees": "₹1.18L",
        "size": "550 Acres",
        "highestCTC": "₹3.67 Cr",
        "avgCTC": "₹23.5 LPA",
        "hostels": "Yes (18 Hostels)",
        "students": "11,500+",
        "img": "https://images.unsplash.com/photo-1562774053-701939374585?w=800&q=80",
        "about": "Established in 1958, IIT Bombay is globally recognized as a leader in engineering education and research. Known for its vibrant Powai campus, Mood Indigo fest, and unmatched entrepreneurship culture.",
        "departments": ["Computer Science", "Electrical Engineering", "Mechanical Engineering", "Aerospace Engineering", "Chemical Engineering"],
        "facilities": ["Central Library", "Olympic Swimming Pool", "18 Hostels", "Campus Hospital", "Sports Complex", "Research Park", "Cafeteria"],
        "ratings": {"academics": 4.9, "faculty": 4.7, "placements": 5.0, "campus": 4.9, "hostel": 4.3, "sports": 4.8}
    },
    {
        "_id": "inst_nitt_2",
        "name": "NIT Trichy",
        "slug": "nit-trichy",
        "type": "NIT",
        "location": "Tiruchirappalli, Tamil Nadu",
        "nirf": "#9 Engineering",
        "nirfNum": 9,
        "est": 1964,
        "fees": "₹85,000",
        "size": "800 Acres",
        "highestCTC": "₹52.8 LPA",
        "avgCTC": "₹17.2 LPA",
        "hostels": "Yes (24 Hostels)",
        "students": "8,200+",
        "img": "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&q=80",
        "about": "National Institute of Technology Tiruchirappalli is the top-ranked NIT in India, famous for its sprawling 800-acre campus, Festember cultural fest, Pragyan tech fest, and stellar core & software placements.",
        "departments": ["Computer Science", "Electronics & Communication", "Mechanical Engineering", "Instrumentation & Control", "Civil Engineering"],
        "facilities": ["Octagon Computer Lab", "Library", "Hostel", "Sports Ground", "Hospital", "Food Street"],
        "ratings": {"academics": 4.6, "faculty": 4.4, "placements": 4.8, "campus": 4.5, "hostel": 4.1, "sports": 4.6}
    },
    {
        "_id": "inst_iiith_3",
        "name": "IIIT Hyderabad",
        "slug": "iiit-hyderabad",
        "type": "IIIT",
        "location": "Hyderabad, Telangana",
        "nirf": "#47 Engineering",
        "nirfNum": 47,
        "est": 1998,
        "fees": "₹2.0L",
        "size": "66 Acres",
        "highestCTC": "₹1.05 Cr",
        "avgCTC": "₹32.0 LPA",
        "hostels": "Yes (5 Hostels)",
        "students": "2,100+",
        "img": "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80",
        "about": "An autonomous research university focused intensively on Computer Science, Electronics, and AI research. Undergraduate students engage in research labs starting from their second year.",
        "departments": ["Computer Science", "Electronics & Communication", "Computational Natural Sciences", "Computer Science + MS"],
        "facilities": ["Research Labs", "Library", "Hostel", "Sports Ground", "Cafeteria"],
        "ratings": {"academics": 5.0, "faculty": 4.9, "placements": 5.0, "campus": 4.2, "hostel": 4.4, "sports": 3.9}
    },
    {
        "_id": "inst_bits_4",
        "name": "BITS Pilani",
        "slug": "bits-pilani",
        "type": "Private",
        "location": "Pilani, Rajasthan",
        "nirf": "#20 Engineering",
        "nirfNum": 20,
        "est": 1964,
        "fees": "₹2.45L",
        "size": "328 Acres",
        "highestCTC": "₹60.75 LPA",
        "avgCTC": "₹20.7 LPA",
        "hostels": "Yes (15 Bhawans)",
        "students": "4,600+",
        "img": "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=800&q=80",
        "about": "India's premier private institute with a 0% mandatory attendance policy, Practice School corporate internships, and a legendary startup alumni network.",
        "departments": ["Computer Science", "Electrical & Electronics", "Mechanical Engineering", "Economics (Dual)"],
        "facilities": ["Library", "Swimming Pool", "Hostel", "Sports Complex", "Cafeteria", "Research Lab"],
        "ratings": {"academics": 4.8, "faculty": 4.6, "placements": 4.9, "campus": 4.8, "hostel": 4.5, "sports": 4.7}
    }
]

REVIEWS = [
    {
        "_id": "rev_1",
        "instId": "inst_iitb_1",
        "author": "Aarav Mehta",
        "email": "aarav@iitb.ac.in",
        "contact": "+91 9876543210",
        "branch": "Computer Science",
        "course": "B.Tech",
        "batch": "2025",
        "exam": "JEE Advanced",
        "rank": 48,
        "score": "312/360",
        "cgpa": "9.1",
        "rating": 5,
        "pros": "Unbeatable peer group, world-class research labs, top quant and HFT firms visit day 1, vibrant late-night campus life around Powai Lake.",
        "cons": "Older hostels (H2-H9) have cramped rooms, humid Mumbai monsoon weather.",
        "body": "Four years at IIT Bombay completely transformed how I approach engineering and problem-solving. Whether you want to build a startup at SINE, get into competitive coding, or pursue a PhD at MIT/Stanford, the ecosystem supports everything.",
        "helpful": 24,
        "createdAt": "2025-02-10T10:30:00Z"
    },
    {
        "_id": "rev_2",
        "instId": "inst_nitt_2",
        "author": "Karthik Sundaram",
        "email": "karthik@nitt.edu",
        "contact": "+91 9123456780",
        "branch": "Electronics & Communication",
        "course": "B.Tech",
        "batch": "2024",
        "exam": "JEE Main",
        "rank": 2140,
        "score": "99.82 %ile",
        "cgpa": "8.6",
        "rating": 5,
        "pros": "Very low fees with massive ROI, Octagon computer centre is open 24/7, top semiconductor companies hire heavily.",
        "cons": "Summer heat in Trichy is intense, strict in-time rules for first-year hostels.",
        "body": "Best decision after JEE Main. The clubs (Delta, Spider, RMI) teach you more practical engineering than textbooks ever could.",
        "helpful": 18,
        "createdAt": "2025-01-18T14:15:00Z"
    }
]

PLACEMENTS = [
    {
        "_id": "pl_1", "instId": "inst_iitb_1", "year": 2025, "branch": "Computer Science", "course": "B.Tech",
        "eligible": 145, "placed": 142, "highCTC": "₹3.67 Cr", "avgCTC": "₹36.8 LPA", "medCTC": "₹31.0 LPA",
        "intlOffers": 18, "ppoOffers": 54, "topRecruiters": ["Jane Street", "Optiver", "Google", "Microsoft", "Rubrik"]
    },
    {
        "_id": "pl_2", "instId": "inst_nitt_2", "year": 2025, "branch": "Computer Science", "course": "B.Tech",
        "eligible": 115, "placed": 111, "highCTC": "₹52.8 LPA", "avgCTC": "₹27.2 LPA", "medCTC": "₹24.0 LPA",
        "intlOffers": 3, "ppoOffers": 34, "topRecruiters": ["Amazon", "Atlassian", "Uber", "Oracle", "DE Shaw"]
    }
]

CUTOFFS = [
    {
        "_id": "cut_1", "instId": "inst_iitb_1", "year": 2025, "branch": "Computer Science",
        "category": "GEN", "exam": "JEE Advanced", "openRank": 1, "closeRank": 68, "prevClose": 67
    },
    {
        "_id": "cut_2", "instId": "inst_nitt_2", "year": 2025, "branch": "Computer Science",
        "category": "GEN", "exam": "JEE Main", "openRank": 310, "closeRank": 1240, "prevClose": 1509
    }
]


# ================= 1. INSTITUTION ENDPOINTS =================

@app.route(f"{BASE}", methods=["GET"])
@app.route(f"{BASE}/", methods=["GET"])
def get_institutions():
    inst_id = request.args.get("id")
    slug = request.args.get("slug")
    inst_type = request.args.get("type")
    search = request.args.get("search", "").lower().strip()
    sort_by = request.args.get("sort")

    results = list(INSTITUTIONS)
    if inst_id:
        results = [i for i in results if i["_id"] == inst_id]
    if slug:
        results = [i for i in results if i.get("slug") == slug]
    if inst_type:
        results = [i for i in results if i.get("type", "").lower() == inst_type.lower()]
    if search:
        results = [
            i for i in results
            if search in i.get("name", "").lower() or search in i.get("location", "").lower()
        ]
    if sort_by == "name":
        results.sort(key=lambda x: x.get("name", ""))
    elif sort_by == "rating":
        results.sort(key=lambda x: x.get("ratings", {}).get("academics", 0), reverse=True)

    return jsonify({"success": True, "data": results})


@app.route(f"{BASE}/create", methods=["POST"])
def create_institution():
    body = request.get_json(force=True)
    if not body.get("name"):
        return jsonify({"success": False, "message": "name is required"}), 400

    depts = body.get("departments", [])
    if isinstance(depts, str):
        depts = [d.strip() for d in depts.split(",") if d.strip()]
    facs = body.get("facilities", [])
    if isinstance(facs, str):
        facs = [f.strip() for f in facs.split(",") if f.strip()]

    default_ratings = {"academics": 4.5, "faculty": 4.4, "placements": 4.5, "campus": 4.4, "hostel": 4.2, "sports": 4.3}
    if isinstance(body.get("ratings"), dict):
        default_ratings.update(body["ratings"])

    new_inst = {
        "_id": gen_id(),
        "name": body["name"],
        "slug": body.get("slug") or body["name"].lower().replace(" ", "-"),
        "type": body.get("type", "Private"),
        "location": body.get("location", "India"),
        "nirf": str(body.get("nirf", "Unranked")),
        "nirfNum": int(body.get("nirfNum") or 999),
        "est": int(body.get("est") or 2000),
        "fees": str(body.get("fees", "₹1.5L")),
        "size": str(body.get("size", "100 Acres")),
        "highestCTC": str(body.get("highestCTC", "₹30 LPA")),
        "avgCTC": str(body.get("avgCTC", "₹12 LPA")),
        "hostels": "Yes" if body.get("hostels") is True else str(body.get("hostels", "Yes")),
        "students": str(body.get("students", "3,000+")),
        "img": body.get("img") or "https://images.unsplash.com/photo-1562774053-701939374585?w=800&q=80",
        "about": body.get("about", ""),
        "departments": depts,
        "facilities": facs,
        "ratings": default_ratings
    }
    INSTITUTIONS.insert(0, new_inst)
    return jsonify({"success": True, "message": "Create Successfully", "data": new_inst})


@app.route(f"{BASE}/update", methods=["PUT"])
def update_institution():
    body = request.get_json(force=True)
    inst_id = body.get("id") or body.get("_id")
    if not inst_id or not body.get("name"):
        return jsonify({"success": False, "message": "id and name are required"}), 400

    for inst in INSTITUTIONS:
        if inst["_id"] == inst_id:
            for k in ["name", "slug", "type", "location", "nirf", "nirfNum", "est", "fees", "size",
                      "highestCTC", "avgCTC", "hostels", "students", "img", "about", "departments", "facilities", "ratings"]:
                if k in body and body[k] is not None:
                    inst[k] = body[k]
            return jsonify({"success": True, "message": "Updated Successfully", "data": inst})
    return jsonify({"success": False, "message": "Institution not found"}), 404


@app.route(f"{BASE}/remove/<inst_id>", methods=["PUT", "DELETE"])
def remove_institution(inst_id):
    global INSTITUTIONS
    INSTITUTIONS = [i for i in INSTITUTIONS if i["_id"] != inst_id]
    return jsonify({"success": True, "message": "Deleted Successfully"})


@app.route(f"{BASE}/image", methods=["PUT"])
def update_institution_image():
    body = request.get_json(force=True)
    inst_id, img = body.get("id"), body.get("img")
    for inst in INSTITUTIONS:
        if inst["_id"] == inst_id:
            inst["img"] = img
            return jsonify({"success": True, "message": "Image Updated Successfully", "data": inst})
    return jsonify({"success": False, "message": "Institution not found"}), 404


@app.route(f"{BASE}/department/add", methods=["PUT"])
def add_department():
    body = request.get_json(force=True)
    inst_id, name = body.get("id"), body.get("name", "").strip()
    for inst in INSTITUTIONS:
        if inst["_id"] == inst_id:
            if name and name not in inst["departments"]:
                inst["departments"].append(name)
            return jsonify({"success": True, "message": "Department Added Successfully", "data": inst})
    return jsonify({"success": False, "message": "Institution not found"}), 404


@app.route(f"{BASE}/department/remove", methods=["PUT"])
def remove_department():
    body = request.get_json(force=True)
    inst_id, name = body.get("id"), body.get("name", "").strip()
    for inst in INSTITUTIONS:
        if inst["_id"] == inst_id:
            inst["departments"] = [d for d in inst["departments"] if d != name]
            return jsonify({"success": True, "message": "Department Removed Successfully", "data": inst})
    return jsonify({"success": False, "message": "Institution not found"}), 404


@app.route(f"{BASE}/facility/add", methods=["PUT"])
def add_facility():
    body = request.get_json(force=True)
    inst_id, name = body.get("id"), body.get("name", "").strip()
    for inst in INSTITUTIONS:
        if inst["_id"] == inst_id:
            if name and name not in inst["facilities"]:
                inst["facilities"].append(name)
            return jsonify({"success": True, "message": "Facility Added Successfully", "data": inst})
    return jsonify({"success": False, "message": "Institution not found"}), 404


@app.route(f"{BASE}/facility/remove", methods=["PUT"])
def remove_facility():
    body = request.get_json(force=True)
    inst_id, name = body.get("id"), body.get("name", "").strip()
    for inst in INSTITUTIONS:
        if inst["_id"] == inst_id:
            inst["facilities"] = [f for f in inst["facilities"] if f != name]
            return jsonify({"success": True, "message": "Facility Removed Successfully", "data": inst})
    return jsonify({"success": False, "message": "Institution not found"}), 404


# ================= 2. AUTH ENDPOINTS =================

@app.route(f"{BASE}/auth/login", methods=["POST"])
def auth_login():
    body = request.get_json(force=True)
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    for u in USERS:
        if u["email"].lower() == email and u["password"] == password:
            token = f"dummy-jwt-{u['id']}"
            return jsonify({
                "success": True,
                "token": token,
                "user": {"id": u["id"], "name": u["name"], "email": u["email"], "role": u["role"]}
            })

    role = "superAdmin" if "admin" in email else "student"
    user_obj = {"id": gen_id(), "name": email.split("@")[0].title(), "email": email, "role": role}
    return jsonify({"success": True, "token": f"dummy-jwt-{role}", "user": user_obj})


@app.route(f"{BASE}/auth/me", methods=["GET"])
def auth_me():
    auth_header = request.headers.get("Authorization", "")
    if "u_admin_1" in auth_header or "superAdmin" in auth_header:
        return jsonify({"success": True, "user": {"id": "u_admin_1", "name": "Super Admin", "email": "admin@campusfile.in", "role": "superAdmin"}})
    return jsonify({"success": True, "user": {"id": "u_stud_1", "name": "Rahul Sharma", "email": "rahul@iitb.ac.in", "role": "student"}})


# ================= 3. REVIEW ENDPOINTS =================

@app.route(f"{BASE}/review", methods=["GET"])
def get_reviews():
    return jsonify({"success": True, "data": REVIEWS})


@app.route(f"{BASE}/review/create", methods=["POST"])
def create_review():
    body = request.get_json(force=True)
    new_rev = {
        "_id": gen_id(),
        "instId": body.get("instId"),
        "author": body.get("author", "Anonymous"),
        "email": body.get("email", ""),
        "contact": body.get("contact", ""),
        "branch": body.get("branch", ""),
        "course": body.get("course", "B.Tech"),
        "batch": body.get("batch", "Currently Enrolled"),
        "exam": body.get("exam", "JEE Main"),
        "rank": body.get("rank", ""),
        "score": body.get("score", ""),
        "cgpa": body.get("cgpa", ""),
        "rating": int(body.get("rating", 5)),
        "pros": body.get("pros", ""),
        "cons": body.get("cons", ""),
        "body": body.get("body", ""),
        "helpful": 0,
        "createdAt": datetime.utcnow().isoformat() + "Z"
    }
    REVIEWS.insert(0, new_rev)
    return jsonify({"success": True, "data": new_rev})


@app.route(f"{BASE}/review/helpful", methods=["PUT"])
def helpful_review():
    body = request.get_json(force=True)
    rev_id = body.get("id")
    for r in REVIEWS:
        if r["_id"] == rev_id:
            r["helpful"] = r.get("helpful", 0) + 1
            return jsonify({"success": True, "data": r})
    return jsonify({"success": False, "message": "Review not found"}), 404


@app.route(f"{BASE}/review/remove/<rev_id>", methods=["PUT", "DELETE"])
def remove_review(rev_id):
    global REVIEWS
    REVIEWS = [r for r in REVIEWS if r["_id"] != rev_id]
    return jsonify({"success": True, "message": "Review Deleted Successfully"})


# ================= 4. PLACEMENT ENDPOINTS =================

@app.route(f"{BASE}/placement", methods=["GET"])
def get_placements():
    return jsonify({"success": True, "data": PLACEMENTS})


@app.route(f"{BASE}/placement/create", methods=["POST"])
def create_placement():
    body = request.get_json(force=True)
    recs = body.get("topRecruiters", [])
    if isinstance(recs, str):
        recs = [x.strip() for x in recs.split(",") if x.strip()]
    new_pl = {
        "_id": gen_id(),
        "instId": body.get("instId"),
        "year": int(body.get("year", 2025)),
        "branch": body.get("branch", "Computer Science"),
        "course": body.get("course", "B.Tech"),
        "eligible": int(body.get("eligible", 100)),
        "placed": int(body.get("placed", 90)),
        "highCTC": body.get("highCTC", "₹40 LPA"),
        "avgCTC": body.get("avgCTC", "₹18 LPA"),
        "medCTC": body.get("medCTC", "₹15 LPA"),
        "intlOffers": int(body.get("intlOffers", 0)),
        "ppoOffers": int(body.get("ppoOffers", 0)),
        "topRecruiters": recs
    }
    PLACEMENTS.insert(0, new_pl)
    return jsonify({"success": True, "data": new_pl})


@app.route(f"{BASE}/placement/remove/<pl_id>", methods=["PUT", "DELETE"])
def remove_placement(pl_id):
    global PLACEMENTS
    PLACEMENTS = [p for p in PLACEMENTS if p["_id"] != pl_id]
    return jsonify({"success": True, "message": "Placement Deleted Successfully"})


# ================= 5. CUTOFF ENDPOINTS =================

@app.route(f"{BASE}/cutoff", methods=["GET"])
def get_cutoffs():
    return jsonify({"success": True, "data": CUTOFFS})


@app.route(f"{BASE}/cutoff/create", methods=["POST"])
def create_cutoff():
    body = request.get_json(force=True)
    new_cut = {
        "_id": gen_id(),
        "instId": body.get("instId"),
        "year": int(body.get("year", 2025)),
        "branch": body.get("branch", "Computer Science"),
        "category": body.get("category", "GEN"),
        "exam": body.get("exam", "JEE Advanced"),
        "openRank": int(body["openRank"]) if body.get("openRank") else None,
        "closeRank": int(body["closeRank"]) if body.get("closeRank") else None,
        "prevClose": int(body["prevClose"]) if body.get("prevClose") else None,
    }
    CUTOFFS.insert(0, new_cut)
    return jsonify({"success": True, "data": new_cut})


@app.route(f"{BASE}/cutoff/remove/<cut_id>", methods=["PUT", "DELETE"])
def remove_cutoff(cut_id):
    global CUTOFFS
    CUTOFFS = [c for c in CUTOFFS if c["_id"] != cut_id]
    return jsonify({"success": True, "message": "Cutoff Deleted Successfully"})


if __name__ == "__main__":
    print(f"🚀 Dummy Flask Backend running on http://127.0.0.1:5000{BASE}")
    print(f"🖼️  Image Upload Server running on http://127.0.0.1:5000/api/upload")
    app.run(host="127.0.0.1", port=5000, debug=True)