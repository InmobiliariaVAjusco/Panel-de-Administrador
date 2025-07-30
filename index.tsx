
import React, { useState, useEffect, createContext, useContext, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom/client';

declare const firebase: any;

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = 'dcm5pug0v';
const CLOUDINARY_UPLOAD_PRESET = 'Inmuebles_Upload';


// =================================================================================
// 0. FIREBASE CONFIGURATION
// =================================================================================
const firebaseConfig = {
  apiKey: "AIzaSyCcU2CbpSkVSVfHIAOvePo7fjlJSRtVjgA",
  authDomain: "inmuebles-v.firebaseapp.com",
  projectId: "inmuebles-v",
  storageBucket: "inmuebles-v.appspot.com",
  messagingSenderId: "114763072584",
  appId: "1:114763072584:web:f69c04f80240f446ef447d",
};

const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
// We no longer use Firebase Storage
const { serverTimestamp } = firebase.firestore.FieldValue;

// =================================================================================
// 1. TYPE DEFINITIONS
// =================================================================================
type PropertyType = 'Residencial' | 'Comercial' | 'Mixto';

interface Property {
  id: string;
  address: string;
  price: number;
  sqft: number;
  frontage: number;
  depth: number;
  propertyType: PropertyType;
  images: string[];
  description: string;
  services: string[];
  publicationDate: string;
  isFeatured?: boolean;
}

// =================================================================================
// 2. SVG ICONS
// =================================================================================
const Icon = ({ path, className = 'w-6 h-6' }) => <svg className={className} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" clipRule="evenodd" d={path}></path></svg>;
const ICONS = {
    DASHBOARD: "M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z",
    PLUS: "M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z",
    TRASH: "M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z",
    PENCIL: "M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828zM5 12V7.172l9.414-9.414a1 1 0 111.414 1.414L5 12zM3 17a1 1 0 01-1-1v-2h12v2a1 1 0 01-1 1H3z",
    LOGOUT: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
    UPLOAD: "M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8m-4-6l-4-4-4 4m4-4v12",
    CHECK_CIRCLE: "M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z",
    X_CIRCLE: "M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z",
    INFO_CIRCLE: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    EYE_OPEN: "M10 12a2 2 0 100-4 2 2 0 000 4zM.2 10a11 11 0 0119.6 0A11 11 0 01.2 10z",
    EYE_SLASHED: "M13.559 13.559a2.5 2.5 0 10-3.536-3.536l-5.11 5.11a11.02 11.02 0 01-2.152-3.126C1.72 9.403 4.19 6 10 6c3.125 0 5.597 1.528 7.154 3.434a11.02 11.02 0 01-1.282 4.187l-5.11-5.11z M2.081 2.081a.5.5 0 00-.707.707L17.919 18.25a.5.5 0 00.707-.707L2.081 2.081z",
    STAR: "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.28 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
};

// =================================================================================
// 3. HELPER COMPONENTS
// =================================================================================

const Spinner = () => <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>;

const ToastContext = createContext(null);

const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const toast = useCallback((message, type = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(current => current.filter(t => t.id !== id)), 5000);
    }, []);

    const toastConfig = {
        success: { bg: 'bg-green-500', icon: ICONS.CHECK_CIRCLE },
        error: { bg: 'bg-red-500', icon: ICONS.X_CIRCLE },
        info: { bg: 'bg-stone-500', icon: ICONS.INFO_CIRCLE },
    };

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div className="fixed top-5 right-5 z-50 flex flex-col gap-3">
                {toasts.map(t => (
                    <div key={t.id} className={`${toastConfig[t.type].bg} text-white py-3 px-4 rounded-lg shadow-2xl flex items-center gap-3 animate-fade-in-up`}>
                        <Icon path={toastConfig[t.type].icon} className="w-5 h-5"/>
                        <span>{t.message}</span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

const useToast = () => useContext(ToastContext);

const Modal = ({ isOpen, onClose, onConfirm, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md m-4 animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <h3 className="text-2xl font-bold text-zinc-800 mb-4">{title}</h3>
                <div className="text-zinc-600 leading-relaxed">{children}</div>
                <div className="mt-8 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2 bg-stone-200 text-zinc-800 rounded-lg hover:bg-stone-300 transition-all font-semibold">
                        Cancelar
                    </button>
                    <button onClick={onConfirm} className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-semibold">
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
};


// =================================================================================
// 4. AUTHENTICATION
// =================================================================================

const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(firebaseUser => {
            setUser(firebaseUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
};

const useAuth = () => useContext(AuthContext);

// =================================================================================
// 5. ROUTING (HASH-BASED)
// =================================================================================

const RouterContext = createContext(null);
const useRouter = () => useContext(RouterContext);

const navigate = (path) => {
    window.location.hash = path;
};

const RouterProvider = ({ children }) => {
    const getPath = useCallback(() => window.location.hash.slice(1) || '/', []);
    const [path, setPath] = useState(getPath());

    useEffect(() => {
        const onLocationChange = () => setPath(getPath());
        window.addEventListener('hashchange', onLocationChange);
        return () => window.removeEventListener('hashchange', onLocationChange);
    }, [getPath]);

    const match = (route) => {
        const routeParts = route.split('/').filter(Boolean);
        const pathParts = path.split('/').filter(Boolean);
        if (routeParts.length !== pathParts.length) return null;
        const params = {};
        for (let i = 0; i < routeParts.length; i++) {
            if (routeParts[i].startsWith(':')) {
                params[routeParts[i].substring(1)] = pathParts[i];
            } else if (routeParts[i] !== pathParts[i]) {
                return null;
            }
        }
        return params;
    };
    
    return <RouterContext.Provider value={{ path, match }}>{children}</RouterContext.Provider>;
};

const Route = ({ path, component: Component }) => {
    const { match } = useRouter();
    const params = match(path);
    return params ? <Component params={params} /> : null;
};

// =================================================================================
// 6. LAYOUT & PROTECTED ROUTES
// =================================================================================
const PageLoader = () => (
    <div className="flex justify-center items-center h-screen w-screen bg-stone-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
    </div>
);

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    useEffect(() => {
        if (!loading && !user) navigate('/login');
    }, [user, loading]);

    if (loading) return <PageLoader />;
    return user ? children : null;
};

const Sidebar = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const { path } = useRouter();

    const handleLogout = async () => {
        await auth.signOut();
        toast('Has cerrado sesión', 'info');
        navigate('/login');
    };
    
    const NavLink = ({ to, icon, label }) => {
        const isActive = path === to;
        return (
            <a href={'#' + to} 
               className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-emerald-100 text-emerald-700' : 'text-zinc-600 hover:bg-stone-100'}`}>
                <Icon path={icon} className="w-5 h-5"/>
                <span className="font-semibold">{label}</span>
            </a>
        );
    };

    return (
        <aside className="w-64 bg-white border-r border-stone-200 flex flex-col p-4">
            <div className="text-2xl font-bold text-emerald-600 mb-8 p-2">Inmuebles V.</div>
            <nav className="flex-grow">
                <NavLink to="/" icon={ICONS.DASHBOARD} label="Dashboard" />
            </nav>
            <div className="mt-auto">
                <div className="p-3 mb-2">
                    <p className="text-sm font-semibold text-zinc-700 truncate">{user?.email}</p>
                </div>
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-600 hover:bg-stone-100 transition-colors">
                     <Icon path={ICONS.LOGOUT} className="w-5 h-5"/>
                    <span className="font-semibold">Cerrar Sesión</span>
                </button>
            </div>
        </aside>
    );
};

const AdminLayout = ({ children }) => (
    <div className="flex h-screen bg-stone-50 text-zinc-800">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
            <div className="p-8 sm:p-12">
                {children}
            </div>
        </main>
    </div>
);


// =================================================================================
// 7. PAGE COMPONENTS
// =================================================================================

const LoginPage = () => {
    const { user, loading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    useEffect(() => {
        if (!loading && user) navigate('/');
    }, [user, loading]);
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            await auth.signInWithEmailAndPassword(email, password);
            navigate('/');
        } catch (err) {
            setError('Credenciales inválidas. Intenta de nuevo.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-stone-100">
            <div className="p-10 bg-white rounded-2xl shadow-xl w-full max-w-md m-4 animate-fade-in-up">
                <h2 className="text-3xl font-bold text-center text-zinc-800 mb-2">Bienvenido</h2>
                <p className="text-center text-zinc-500 mb-8">Inicia sesión para administrar</p>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-1" htmlFor="email">Correo electrónico</label>
                        <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-stone-100 border-stone-300 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all text-zinc-900" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-1" htmlFor="password">Contraseña</label>
                        <div className="relative">
                            <input type={isPasswordVisible ? 'text' : 'password'} id="password" value={password} onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 pr-10 bg-stone-100 border-stone-300 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all text-zinc-900" required />
                             <button type="button" onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-700"
                                aria-label={isPasswordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                                <Icon path={isPasswordVisible ? ICONS.EYE_OPEN : ICONS.EYE_SLASHED} className="w-5 h-5"/>
                            </button>
                        </div>
                    </div>
                    {error && <p className="text-red-500 text-center text-sm">{error}</p>}
                    <button type="submit" disabled={isSubmitting}
                        className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-emerald-400 flex justify-center items-center font-bold text-base">
                        {isSubmitting ? <Spinner /> : 'Acceder'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const PropertyCard = ({ prop, onEdit, onDelete }) => (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 group">
        <div className="relative">
            <img src={prop.images?.[0] || 'https://via.placeholder.com/400x300.png?text=Sin+Imagen'} alt={prop.address} className="w-full h-48 object-cover"/>
            {prop.isFeatured && (
                <div className="absolute top-2 right-2 px-2 py-1 text-xs font-bold text-white rounded-full bg-amber-500 flex items-center gap-1 shadow-md">
                    <Icon path={ICONS.STAR} className="w-3 h-3"/>
                    <span>Destacado</span>
                </div>
            )}
             <div className="absolute bottom-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-2">
                <button onClick={() => onEdit(prop.id)} className="bg-white/80 backdrop-blur-sm p-2 rounded-full text-emerald-600 hover:bg-white hover:scale-110 transition-all">
                    <Icon path={ICONS.PENCIL} className="w-5 h-5"/>
                </button>
                <button onClick={() => onDelete(prop)} className="bg-white/80 backdrop-blur-sm p-2 rounded-full text-red-600 hover:bg-white hover:scale-110 transition-all">
                     <Icon path={ICONS.TRASH} className="w-5 h-5"/>
                </button>
            </div>
        </div>
        <div className="p-5">
            <h3 className="font-bold text-lg text-zinc-800 truncate">{prop.address}</h3>
            <p className="text-emerald-600 font-semibold text-xl mt-1">${new Intl.NumberFormat('es-MX').format(prop.price)}</p>
            <div className="flex justify-between text-sm text-zinc-500 mt-3 border-t pt-3">
                 <span>{prop.sqft} m²</span>
                 <span>{prop.propertyType}</span>
            </div>
        </div>
    </div>
);


const DashboardPage = () => {
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [propertyToDelete, setPropertyToDelete] = useState(null);
    const { toast } = useToast();

    useEffect(() => {
        const fetchProperties = async () => {
            setLoading(true);
            try {
                const snapshot = await db.collection('properties').orderBy('publicationDate', 'desc').get();
                setProperties(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (error) {
                toast('Error al cargar los inmuebles', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchProperties();
    }, [toast]);

    const openDeleteModal = (property) => {
        setPropertyToDelete(property);
        setModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!propertyToDelete) return;
        try {
            // Client-side deletion from a media library like Cloudinary is insecure
            // without a backend. We will just delete the reference from Firestore.
            await db.collection('properties').doc(propertyToDelete.id).delete();
            toast('Inmueble eliminado con éxito', 'success');
            setProperties(properties.filter(p => p.id !== propertyToDelete.id));
        } catch (error) {
            toast('Error al eliminar el inmueble', 'error');
        } finally {
            setModalOpen(false);
            setPropertyToDelete(null);
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-4xl font-bold text-zinc-800">Inmuebles</h2>
                <button onClick={() => navigate('/inmuebles/nuevo')} className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow hover:shadow-lg font-semibold">
                    <Icon path={ICONS.PLUS} className="w-5 h-5"/>
                    <span>Añadir Nuevo</span>
                </button>
            </div>
            {loading ? <PageLoader/> : (
                properties.length > 0 ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {properties.map(prop => (
                            <PropertyCard key={prop.id} prop={prop} onEdit={(id) => navigate(`/inmuebles/editar/${id}`)} onDelete={openDeleteModal} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 px-6 bg-white rounded-xl shadow-md">
                        <h3 className="text-xl font-semibold text-zinc-700">No hay inmuebles registrados</h3>
                        <p className="text-zinc-500 mt-2">¡Comienza añadiendo tu primer inmueble!</p>
                    </div>
                )
            )}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} onConfirm={handleDeleteConfirm} title="Confirmar Eliminación">
                <p>¿Estás seguro de que deseas eliminar este inmueble? Esta acción no se puede deshacer.</p>
            </Modal>
        </div>
    );
};

const uploadImageToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error.message || 'Cloudinary upload failed');
        }
        const data = await response.json();
        return data.secure_url;
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
};

const PropertyFormPage = ({ params }) => {
    const { propertyId } = params || {};
    const isEditMode = !!propertyId;
    const { toast } = useToast();
    
    const [formData, setFormData] = useState({
        address: '', price: '', sqft: '', frontage: '', depth: '', propertyType: 'Residencial',
        description: '', services: '', isFeatured: false,
    });
    const [existingImages, setExistingImages] = useState([]);
    const [newImageFiles, setNewImageFiles] = useState([]);
    const [loading, setLoading] = useState(isEditMode);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isEditMode) {
            db.collection('properties').doc(propertyId).get().then(doc => {
                if (doc.exists) {
                    const data = doc.data();
                    setFormData({
                        address: data.address || '',
                        price: `${data.price ?? ''}`,
                        sqft: `${data.sqft ?? ''}`,
                        frontage: `${data.frontage ?? ''}`,
                        depth: `${data.depth ?? ''}`,
                        propertyType: data.propertyType,
                        description: data.description,
                        services: (data.services || []).join(', '),
                        isFeatured: data.isFeatured || false,
                    });
                    setExistingImages(data.images || []);
                } else {
                    toast('Inmueble no encontrado', 'error'); navigate('/');
                }
            }).catch(err => toast('Error al cargar datos del inmueble', 'error')).finally(() => setLoading(false));
        }
    }, [propertyId, isEditMode, toast]);

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleFileChange = (e) => setNewImageFiles(Array.from(e.target.files));
    const handleDeleteExistingImage = (imageUrl) => {
        setExistingImages(prev => prev.filter(url => url !== imageUrl));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const newImageUrls = await Promise.all(newImageFiles.map(file => uploadImageToCloudinary(file)));
            const dataToSave = {
                address: formData.address,
                propertyType: formData.propertyType,
                description: formData.description,
                price: parseFloat(formData.price) || 0,
                sqft: parseFloat(formData.sqft) || 0,
                frontage: parseFloat(formData.frontage) || 0,
                depth: parseFloat(formData.depth) || 0,
                services: formData.services.split(',').map(s => s.trim()).filter(Boolean),
                images: [...existingImages, ...newImageUrls],
                isFeatured: formData.isFeatured,
            };
            if (isEditMode) {
                await db.collection('properties').doc(propertyId).update(dataToSave);
                toast('Inmueble actualizado con éxito', 'success');
            } else {
                const finalPropertyId = db.collection('properties').doc().id;
                await db.collection('properties').doc(finalPropertyId).set({ ...dataToSave, publicationDate: new Date().toISOString() });
                toast('Inmueble creado con éxito', 'success');
            }
            navigate('/');
        } catch (error) {
            console.error(error);
            toast('Error al guardar el inmueble. Revisa la consola para más detalles.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (loading) return <PageLoader />;
    
    const renderField = (id, label, type = 'text', options = {}) => (
      <div>
        <label htmlFor={id} className="block text-sm font-medium text-zinc-700">{label}</label>
        <input type={type} name={id} id={id} value={formData[id]} onChange={handleChange}
               className="mt-1 block w-full bg-stone-100 border-stone-300 rounded-lg shadow-sm focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white sm:text-sm py-2 px-3 transition-colors duration-200" {...options} />
      </div>
    );
    
    const renderSelect = (id, label, children) => (
      <div>
        <label htmlFor={id} className="block text-sm font-medium text-zinc-700">{label}</label>
        <select id={id} name={id} value={formData[id]} onChange={handleChange} className="mt-1 block w-full bg-stone-100 border-stone-300 rounded-lg shadow-sm focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white sm:text-sm py-2 px-3 transition-colors duration-200">
          {children}
        </select>
      </div>
    );

    const ToggleSwitch = ({ label, enabled, setEnabled }) => (
        <div className="flex items-center justify-between bg-stone-100 p-3 rounded-lg">
            <span className="text-sm font-medium text-zinc-700">{label}</span>
            <button type="button" onClick={() => setEnabled(!enabled)}
                className={`${enabled ? 'bg-emerald-600' : 'bg-stone-300'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500`}
                aria-pressed={enabled}>
                <span className={`${enabled ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`} />
            </button>
        </div>
    );

    return (
        <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-xl shadow-lg animate-fade-in">
            <h2 className="text-3xl font-bold text-zinc-800">{isEditMode ? 'Editar Inmueble' : 'Añadir Nuevo Inmueble'}</h2>
            
            <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="sm:col-span-2">{renderField('address', 'Dirección')}</div>
                    {renderField('price', 'Precio', 'number', { min: 0, step: 0.01 })}
                    {renderField('sqft', 'Metros Cuadrados (m²)', 'number', { min: 0 })}
                    {renderField('frontage', 'Frente (m)', 'number', { min: 0 })}
                    {renderField('depth', 'Fondo (m)', 'number', { min: 0 })}
                    {renderSelect('propertyType', 'Tipo de Inmueble', <><option>Residencial</option><option>Comercial</option><option>Mixto</option></>)}
                    <div className="sm:col-span-2">{renderField('services', 'Servicios (separados por coma)')}</div>
                    <div className="sm:col-span-2">
                        <label htmlFor="description" className="block text-sm font-medium text-zinc-700">Descripción</label>
                        <textarea id="description" name="description" rows={5} value={formData.description} onChange={handleChange} className="mt-1 block w-full bg-stone-100 border-stone-300 rounded-lg shadow-sm focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white sm:text-sm py-2 px-3 transition-colors duration-200"></textarea>
                    </div>
                     <div className="sm:col-span-2">
                        <ToggleSwitch label="Marcar como Destacado" enabled={formData.isFeatured} setEnabled={(value) => setFormData(prev => ({...prev, isFeatured: value}))} />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-700">Imágenes</label>
                    {existingImages.length > 0 && (
                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {existingImages.map(url => (
                                <div key={url} className="relative group">
                                    <img src={url} alt="Inmueble" className="w-full h-32 object-cover rounded-lg" />
                                    <button type="button" onClick={() => handleDeleteExistingImage(url)} className="absolute top-1 right-1 bg-red-600/80 text-white rounded-full p-1 leading-none hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-all">
                                        <Icon path="M6 18L18 6M6 6l12 12" className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="mt-4 flex justify-center px-6 pt-5 pb-6 border-2 border-stone-300 border-dashed rounded-lg">
                        <div className="space-y-1 text-center">
                            <Icon path={ICONS.UPLOAD} className="mx-auto h-12 w-12 text-stone-400" />
                            <div className="flex text-sm text-zinc-600 justify-center">
                                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-emerald-600 hover:text-emerald-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-emerald-500">
                                    <span>Subir archivos</span>
                                    <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={handleFileChange} />
                                </label>
                                <p className="pl-1">o arrastrar y soltar</p>
                            </div>
                            <p className="text-xs text-zinc-500">PNG, JPG, etc.</p>
                        </div>
                    </div>
                     {newImageFiles.length > 0 && (
                         <div className="mt-4 space-y-2">
                             <p className="text-sm font-medium text-zinc-700">{newImageFiles.length} archivo(s) seleccionado(s) para subir:</p>
                             <ul className="list-disc list-inside text-sm text-zinc-600">
                                 {newImageFiles.map(file => <li key={file.name} className="truncate">{file.name}</li>)}
                             </ul>
                         </div>
                     )}
                </div>
            </div>

            <div className="pt-5 border-t border-stone-200">
                <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => navigate('/')} className="bg-white py-2 px-5 border border-stone-300 rounded-lg shadow-sm text-sm font-medium text-zinc-700 hover:bg-stone-100">
                        Cancelar
                    </button>
                    <button type="submit" disabled={isSubmitting} className="inline-flex justify-center py-2 px-5 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">
                        {isSubmitting ? <Spinner /> : 'Guardar Inmueble'}
                    </button>
                </div>
            </div>
        </form>
    );
};

// =================================================================================
// 8. APP ROOT
// =================================================================================

const App = () => {
    const { path } = useRouter();
    const { user, loading } = useAuth();

    // Define valid application routes for logged-in users to handle 404s
    const validRoutePatterns = useMemo(() => [
        /^\/$/, // Dashboard
        /^\/login$/, // Login page
        /^\/inmuebles\/nuevo$/, // New property form
        /^\/inmuebles\/editar\/[\w-]+$/ // Edit property form
    ], []);

    const isPathValid = useMemo(() => validRoutePatterns.some(pattern => pattern.test(path)), [path, validRoutePatterns]);

    useEffect(() => {
        // Redirect logic
        if (!loading) {
            if (user && (path === '/login' || !isPathValid)) {
                navigate('/');
            } else if (!user && path !== '/login') {
                navigate('/login');
            }
        }
    }, [user, loading, path, isPathValid]);

    if (loading) {
        return <PageLoader />;
    }

    if (!user) {
        return <Route path="/login" component={LoginPage} />;
    }
    
    return (
        <ProtectedRoute>
            <AdminLayout>
                <Route path="/" component={DashboardPage} />
                <Route path="/inmuebles/nuevo" component={PropertyFormPage} />
                <Route path="/inmuebles/editar/:propertyId" component={PropertyFormPage} />
            </AdminLayout>
        </ProtectedRoute>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <AuthProvider>
            <ToastProvider>
                 <RouterProvider>
                    <App />
                </RouterProvider>
            </ToastProvider>
        </AuthProvider>
    </React.StrictMode>
);