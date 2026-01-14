import React, { useEffect, useState } from 'react';
import { X, Mail, BookOpen, Heart, Calendar, Shield, User, Loader2, Camera, Edit2, Save, Check } from 'lucide-react';
import { db, auth } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';

// Reuse your Cloudinary Config (switched to 'image/upload' for photos)
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/du1dwcrhb/image/upload";
const CLOUDINARY_PRESET = "tasks_pdfs"; // We can reuse this, or create a new one for images

const ProfileModal = ({ isOpen, onClose }) => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    // --- EDITING STATES ---
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState("");
    const [editCourse, setEditCourse] = useState("");
    const [editHobbies, setEditHobbies] = useState("");

    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Fetch Data
    useEffect(() => {
        const fetchProfile = async () => {
            const user = auth.currentUser;
            if (!user) return;

            try {
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setProfile(data);
                    // Initialize Edit States
                    setEditName(data.username || user.displayName || "");
                    setEditCourse(data.course || "");
                    setEditHobbies(data.hobbies || "");
                } else {
                    const fallback = {
                        username: user.displayName,
                        email: user.email,
                        photoURL: user.photoURL,
                        createdAt: new Date().toISOString()
                    };
                    setProfile(fallback);
                    setEditName(fallback.username || "");
                }
            } catch (error) {
                console.error("Error fetching profile:", error);
            } finally {
                setLoading(false);
            }
        };

        if (isOpen) {
            setLoading(true);
            fetchProfile();
            setIsEditing(false); // Reset edit mode on open
            setImageFile(null);
            setImagePreview(null);
        }
    }, [isOpen]);

    // Handle File Selection
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    // Upload to Cloudinary
    const uploadImage = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_PRESET);

        try {
            const response = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
            const data = await response.json();
            return data.secure_url;
        } catch (error) {
            console.error("Upload failed:", error);
            return null;
        }
    };

    // Save Changes
    const handleSave = async () => {
        setIsSaving(true);
        const user = auth.currentUser;
        if (!user) return;

        try {
            let photoURL = profile.photoURL;

            // 1. Upload New Image if selected
            if (imageFile) {
                const url = await uploadImage(imageFile);
                if (url) photoURL = url;
            }

            // 2. Update Firestore
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                username: editName,
                course: editCourse,
                hobbies: editHobbies,
                photoURL: photoURL
            });

            // 3. Update Auth Profile (Display Name & Photo)
            await updateProfile(user, {
                displayName: editName,
                photoURL: photoURL
            });

            // 4. Update Local State
            setProfile(prev => ({
                ...prev,
                username: editName,
                course: editCourse,
                hobbies: editHobbies,
                photoURL: photoURL
            }));

            setIsEditing(false);
        } catch (error) {
            console.error("Error saving profile:", error);
            alert("Failed to save changes.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    const formatDate = (isoString) => {
        if (!isoString) return "N/A";
        return new Date(isoString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-950 w-full max-w-2xl rounded-[32px] shadow-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden flex flex-col relative transition-all">

                {/* Close Button */}
                {!isEditing && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white z-10 transition-colors"
                    >
                        <X size={20} />
                    </button>
                )}

                {loading ? (
                    <div className="h-96 flex items-center justify-center">
                        <Loader2 size={32} className="animate-spin text-teal-600" />
                    </div>
                ) : (
                    <>
                        {/* Header / Cover */}
                        <div className="h-40 bg-gradient-to-r from-teal-500 to-emerald-500 relative">
                            {/* Edit Toggle Button (Top Right of Cover) */}
                            <div className="absolute top-4 right-16 z-10">
                                {isEditing ? (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setIsEditing(false)}
                                            className="px-4 py-2 bg-white/20 backdrop-blur-md rounded-xl text-white font-bold text-xs hover:bg-white/30 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            disabled={isSaving}
                                            className="px-4 py-2 bg-white text-teal-600 rounded-xl font-bold text-xs shadow-lg flex items-center gap-2 hover:bg-gray-50 transition-colors"
                                        >
                                            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                            Save
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors"
                                        title="Edit Profile"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                )}
                            </div>

                            {/* Profile Picture Section */}
                            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 group">
                                <div className="w-28 h-28 rounded-full border-[6px] border-white dark:border-zinc-950 bg-white dark:bg-zinc-900 overflow-hidden shadow-xl flex items-center justify-center relative">

                                    {/* Image */}
                                    {imagePreview || profile?.photoURL ? (
                                        <img src={imagePreview || profile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={48} className="text-gray-400" />
                                    )}

                                    {/* Camera Overlay (Only in Edit Mode) */}
                                    {isEditing && (
                                        <label className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Camera size={24} className="text-white drop-shadow-md" />
                                            <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                        </label>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="pt-16 pb-10 px-8 text-center">

                            {/* Username Input vs Display */}
                            <div className="mb-2 flex justify-center">
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="text-2xl font-extrabold text-center bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-2 focus:ring-2 focus:ring-teal-500 outline-none w-full max-w-xs text-gray-900 dark:text-white"
                                        placeholder="Enter Username"
                                    />
                                ) : (
                                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
                                        {profile?.username || "User"}
                                    </h2>
                                )}
                            </div>

                            <div className="flex justify-center mb-8">
                                <span className="px-4 py-1.5 rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 text-xs font-bold uppercase tracking-wide border border-teal-100 dark:border-teal-900 flex items-center gap-1.5">
                                    <Shield size={14} />
                                    {profile?.role || "Member"}
                                </span>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                                <InfoItem
                                    icon={<Mail size={20} />}
                                    label="Email"
                                    value={profile?.email} // Email is usually not editable easily due to Auth restrictions
                                    readOnly={true}
                                />

                                {/* Editable Fields */}
                                <EditableInfoItem
                                    icon={<BookOpen size={20} />}
                                    label="Course"
                                    value={editCourse}
                                    isEditing={isEditing}
                                    onChange={(e) => setEditCourse(e.target.value)}
                                    originalValue={profile?.course}
                                />

                                <EditableInfoItem
                                    icon={<Heart size={20} />}
                                    label="Hobbies"
                                    value={editHobbies}
                                    isEditing={isEditing}
                                    onChange={(e) => setEditHobbies(e.target.value)}
                                    originalValue={profile?.hobbies}
                                />

                                <InfoItem
                                    icon={<Calendar size={20} />}
                                    label="Joined"
                                    value={formatDate(profile?.createdAt)}
                                    readOnly={true}
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 flex justify-center">
                            <p className="text-xs text-gray-400 font-mono">
                                UID: {profile?.uid?.slice(0, 8)}...
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

// Helper: Standard Info Item
const InfoItem = ({ icon, label, value }) => (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800">
        <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-gray-400 dark:text-zinc-500 shadow-sm shrink-0">
            {icon}
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
            <p className="text-base font-bold text-gray-900 dark:text-white truncate">{value || "Not set"}</p>
        </div>
    </div>
);

// Helper: Editable Info Item
const EditableInfoItem = ({ icon, label, value, isEditing, onChange, originalValue }) => (
    <div className={`flex items-center gap-4 p-4 rounded-2xl border transition-all
        ${isEditing
            ? 'bg-white dark:bg-zinc-950 border-teal-500 ring-1 ring-teal-500/20'
            : 'bg-gray-50 dark:bg-zinc-900 border-gray-100 dark:border-zinc-800'
        }`}>
        <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-gray-400 dark:text-zinc-500 shadow-sm shrink-0">
            {icon}
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
            {isEditing ? (
                <input
                    type="text"
                    value={value}
                    onChange={onChange}
                    className="w-full bg-transparent border-b border-gray-200 dark:border-zinc-700 focus:border-teal-500 outline-none text-base font-bold text-gray-900 dark:text-white pb-0.5"
                    placeholder={`Enter ${label}`}
                />
            ) : (
                <p className="text-base font-bold text-gray-900 dark:text-white truncate">{originalValue || "Not set"}</p>
            )}
        </div>
    </div>
);

export default ProfileModal;