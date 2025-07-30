
import React, { useState, useEffect, createContext, useContext, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom/client';

declare const firebase: any;

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = 'dcm5pug0v';
const CLOUDINARY_UPLOAD_PRESET = 'Inmuebles_Upload';
const LOGO_URL = "https://res.cloudinary.com/dcm5pug0v/image/upload/v1753909938/505390648_122139922838632722_2166154781793358623_n-removebg-preview_usoh8t.png";

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

// =================================================================================
// 1. TYPE DEFINITIONS
// =================================================================================
type Page = 'dashboard' | 'form';

interface Property {
  id: string;
  address: string;
  price: number;
  sqft: number;
  listingType: 'Venta' | 'Renta';
  category: string;
  mainFeatures: string[];
  description: string;
  images: string[];
  isFeatured: boolean;
  publicationDate: string;
  frontage?: number;
  depth?: number;
  rooms?: number;
  bathrooms?: number;
  services?: string[];
}

// =================================================================================
// 2. SVG ICONS
// =================================================================================
const Icon = ({ path, className = 'w-6 h-6' }) => <svg className={className} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" clipRule="evenodd" d={path}></path></svg>;
const ICONS = {
    DASHBOARD: "M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z",
    PLUS: "M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z",
    TRASH: "M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8z",
    PENCIL: "M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828zM5 14H3v2h2v-2zM5 10H3v2h2v-2zM5 6H3v2h2V6zm4-4h2v2h-2V2zM3 4c0-1.1.9-2 2-2h2v2H5v2H3V4z",
    LOGOUT: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
    X: "M6 18L18 6M6 6l12 12",
};

// =================================================================================
// 3. AUTHENTICATION CONTEXT
// =================================================================================
const AuthContext = createContext<{ user: any; loading: boolean } | null>(null);

const AuthProvider = ({ children }) => {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user: any) => {
            setUser(user);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center"><div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-emerald-500"></div></div>;
    }

    return (
        <AuthContext.Provider value={{ user, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

const useAuth = () => useContext(AuthContext);

// =================================================================================
// 4. UTILITY FUNCTIONS
// =================================================================================
const uploadToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error('Image upload failed');
    }

    const data = await response.json();
    return data.secure_url;
};

// =================================================================================
// 5. PROPERTY FORM COMPONENT
// =================================================================================
const PropertyForm = ({ propertyToEdit, onFormSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        address: '', price: '', sqft: '',
        listingType: 'Venta' as 'Venta' | 'Renta',
        category: 'Casa',
        mainFeatures: ['', '', ''],
        description: '',
        images: [] as string[],
        isFeatured: false,
        frontage: '', depth: '', rooms: '', bathrooms: '',
        services: [] as string[],
    });
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const CATEGORY_OPTIONS = ['Casa', 'Departamento', 'Terreno', 'Rancho', 'Casa en condominio', 'Casa con terreno', 'Comercial', 'Mixto'];

    useEffect(() => {
        if (propertyToEdit) {
            setFormData({
                ...propertyToEdit,
                price: String(propertyToEdit.price || ''),
                sqft: String(propertyToEdit.sqft || ''),
                frontage: String(propertyToEdit.frontage || ''),
                depth: String(propertyToEdit.depth || ''),
                rooms: String(propertyToEdit.rooms || ''),
                bathrooms: String(propertyToEdit.bathrooms || ''),
                mainFeatures: propertyToEdit.mainFeatures || ['', '', ''],
                services: propertyToEdit.services || [],
            });
        }
    }, [propertyToEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: checked }));
    };

    const handleMainFeatureChange = (index: number, value: string) => {
        const newFeatures = [...formData.mainFeatures];
        newFeatures[index] = value;
        setFormData(prev => ({...prev, mainFeatures: newFeatures}));
    };

    const handleServiceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            services: checked ? [...prev.services, value] : prev.services.filter(s => s !== value)
        }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setImageFiles(Array.from(e.target.files));
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const imageUrls = await Promise.all(imageFiles.map(uploadToCloudinary));
            const finalImages = propertyToEdit ? [...formData.images, ...imageUrls] : imageUrls;
            
            const propertyData: any = {
                address: formData.address,
                price: parseFloat(formData.price),
                sqft: parseFloat(formData.sqft),
                listingType: formData.listingType,
                category: formData.category,
                mainFeatures: formData.mainFeatures,
                description: formData.description,
                images: finalImages,
                isFeatured: formData.isFeatured,
                services: formData.services,
            };

            // Add optional numeric fields only if they have a value
            if (formData.frontage) propertyData.frontage = parseFloat(formData.frontage);
            if (formData.depth) propertyData.depth = parseFloat(formData.depth);
            if (formData.rooms) propertyData.rooms = parseInt(formData.rooms, 10);
            if (formData.bathrooms) propertyData.bathrooms = parseInt(formData.bathrooms, 10);

            // Add publication date for new properties
            if (!propertyToEdit) {
                propertyData.publicationDate = new Date().toISOString();
            } else {
                propertyData.publicationDate = propertyToEdit.publicationDate; // Preserve original date
            }
            
            onFormSubmit(propertyData);

        } catch (error) {
            console.error("Error submitting form: ", error);
            alert("Hubo un error al guardar la propiedad.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-lg shadow-md animate-fade-in-up">
            <h2 className="text-2xl font-bold text-stone-800">{propertyToEdit ? 'Editar' : 'Agregar'} Propiedad</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <input name="address" value={formData.address} onChange={handleChange} placeholder="Dirección" className="w-full px-4 py-2 border border-stone-300 rounded-md lg:col-span-3" required />
                
                <input name="price" type="number" value={formData.price} onChange={handleChange} placeholder="Precio" className="w-full px-4 py-2 border border-stone-300 rounded-md" required />
                <input name="sqft" type="number" value={formData.sqft} onChange={handleChange} placeholder="Superficie (m²)" className="w-full px-4 py-2 border border-stone-300 rounded-md" required />
                
                <select name="listingType" value={formData.listingType} onChange={handleChange} className="w-full px-4 py-2 border border-stone-300 rounded-md" required>
                    <option value="Venta">Venta</option>
                    <option value="Renta">Renta</option>
                </select>
                
                <select name="category" value={formData.category} onChange={handleChange} className="w-full px-4 py-2 border border-stone-300 rounded-md lg:col-span-2" required>
                    {CATEGORY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>

                <input name="frontage" type="number" value={formData.frontage} onChange={handleChange} placeholder="Frente (m) (Opcional)" className="w-full px-4 py-2 border border-stone-300 rounded-md" />
                <input name="depth" type="number" value={formData.depth} onChange={handleChange} placeholder="Fondo (m) (Opcional)" className="w-full px-4 py-2 border border-stone-300 rounded-md" />
                <input name="rooms" type="number" value={formData.rooms} onChange={handleChange} placeholder="Cuartos (Opcional)" className="w-full px-4 py-2 border border-stone-300 rounded-md" />
                <input name="bathrooms" type="number" value={formData.bathrooms} onChange={handleChange} placeholder="Baños (Opcional)" className="w-full px-4 py-2 border border-stone-300 rounded-md" />
            </div>

            <div>
                <label className="block text-sm font-medium text-stone-600 mb-2">Características Principales (3 obligatorias)</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input value={formData.mainFeatures[0]} onChange={(e) => handleMainFeatureChange(0, e.target.value)} placeholder="Característica 1" className="w-full px-4 py-2 border border-stone-300 rounded-md" required />
                    <input value={formData.mainFeatures[1]} onChange={(e) => handleMainFeatureChange(1, e.target.value)} placeholder="Característica 2" className="w-full px-4 py-2 border border-stone-300 rounded-md" required />
                    <input value={formData.mainFeatures[2]} onChange={(e) => handleMainFeatureChange(2, e.target.value)} placeholder="Característica 3" className="w-full px-4 py-2 border border-stone-300 rounded-md" required />
                </div>
            </div>

            <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Descripción larga" className="w-full px-4 py-2 border border-stone-300 rounded-md" rows={4} required></textarea>
            
            <div>
                <label className="block text-sm font-medium text-stone-600 mb-2">Servicios (Opcional)</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {['Agua', 'Luz', 'Drenaje', 'Pavimento', 'Teléfono', 'Internet', 'Facilidades de pago'].map(service => (
                        <label key={service} className="flex items-center space-x-2">
                            <input type="checkbox" value={service} checked={formData.services.includes(service)} onChange={handleServiceChange} className="rounded text-emerald-600 focus:ring-emerald-500" />
                            <span>{service}</span>
                        </label>
                    ))}
                </div>
            </div>
             
             <div>
                <label className="block text-sm font-medium text-stone-600 mb-2">Imágenes</label>
                <input type="file" multiple onChange={handleImageChange} className="w-full text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"/>
            </div>

            <div className="flex items-center">
                 <label className="flex items-center space-x-2">
                    <input type="checkbox" name="isFeatured" checked={formData.isFeatured} onChange={handleCheckboxChange} className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500" />
                    <span>¿Es una propiedad destacada?</span>
                </label>
            </div>

            <div className="flex justify-end gap-4">
                <button type="button" onClick={onCancel} className="px-6 py-2 border border-stone-300 rounded-md text-stone-700 hover:bg-stone-100">Cancelar</button>
                <button type="submit" disabled={isLoading} className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-md hover:bg-emerald-700 disabled:bg-emerald-400">{isLoading ? 'Guardando...' : 'Guardar'}</button>
            </div>
        </form>
    );
};


// =================================================================================
// 6. DASHBOARD COMPONENT
// =================================================================================
const Dashboard = () => {
    const [page, setPage] = useState<Page>('dashboard');
    const [properties, setProperties] = useState<Property[]>([]);
    const [propertyToEdit, setPropertyToEdit] = useState<Property | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = db.collection('properties').orderBy('publicationDate', 'desc').onSnapshot((snapshot: any) => {
            const props = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
            setProperties(props);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleAddProperty = () => {
        setPropertyToEdit(null);
        setPage('form');
    };

    const handleEditProperty = (property: Property) => {
        setPropertyToEdit(property);
        setPage('form');
    };

    const handleDeleteProperty = async (id: string) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar esta propiedad?')) {
            await db.collection('properties').doc(id).delete();
        }
    };

    const handleFormSubmit = async (propertyData: Partial<Property>) => {
        if (propertyToEdit) {
            await db.collection('properties').doc(propertyToEdit.id).update(propertyData);
        } else {
            await db.collection('properties').add(propertyData);
        }
        setPage('dashboard');
        setPropertyToEdit(null);
    };

    const renderContent = () => {
        if (page === 'form') {
            return <PropertyForm propertyToEdit={propertyToEdit} onFormSubmit={handleFormSubmit} onCancel={() => setPage('dashboard')} />;
        }
        
        return (
            <div className="animate-fade-in">
                 <h1 className="text-3xl font-bold text-stone-800 mb-6">Propiedades</h1>
                 <div className="bg-white shadow-md rounded-lg overflow-hidden">
                    <ul className="divide-y divide-stone-200">
                        {loading ? <li className="p-4 text-center">Cargando...</li> :
                         properties.map(prop => (
                            <li key={prop.id} className="p-4 flex items-center justify-between hover:bg-stone-50">
                                <div className="flex-1">
                                    <p className="font-semibold text-stone-800">{prop.address}</p>
                                    <div className="text-sm text-stone-500 flex items-center gap-x-3">
                                      <span className="font-medium text-emerald-600">${(prop.price || 0).toLocaleString()}</span>
                                      <span className="bg-stone-200 px-2 py-0.5 rounded-full text-xs">{prop.listingType}</span>
                                      <span className="bg-stone-200 px-2 py-0.5 rounded-full text-xs">{prop.category}</span>
                                      {prop.isFeatured && <span className="bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full text-xs font-semibold">Destacada</span>}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEditProperty(prop)} className="p-2 text-stone-500 hover:text-emerald-600"><Icon path={ICONS.PENCIL} /></button>
                                    <button onClick={() => handleDeleteProperty(prop.id)} className="p-2 text-stone-500 hover:text-red-600"><Icon path={ICONS.TRASH} /></button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-screen bg-stone-50">
            {/* Sidebar */}
            <div className="w-64 bg-white border-r border-stone-200 flex flex-col">
                <div className="p-4 border-b border-stone-200 flex items-center justify-center h-28">
                     <img src={LOGO_URL} alt="Logo" className="max-h-full" />
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    <button onClick={() => setPage('dashboard')} className={`w-full flex items-center gap-3 px-4 py-2 rounded-md ${page === 'dashboard' ? 'bg-emerald-100 text-emerald-700' : 'text-stone-600 hover:bg-stone-100'}`}>
                        <Icon path={ICONS.DASHBOARD} /><span>Dashboard</span>
                    </button>
                    <button onClick={handleAddProperty} className="w-full flex items-center gap-3 px-4 py-2 rounded-md text-stone-600 hover:bg-stone-100">
                        <Icon path={ICONS.PLUS} /><span>Agregar Propiedad</span>
                    </button>
                </nav>
                <div className="p-4 border-t border-stone-200">
                     <button onClick={() => auth.signOut()} className="w-full flex items-center gap-3 px-4 py-2 rounded-md text-stone-600 hover:bg-stone-100">
                        <Icon path={ICONS.LOGOUT} /><span>Cerrar Sesión</span>
                    </button>
                </div>
            </div>
            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto">
                {renderContent()}
            </main>
        </div>
    );
};

// =================================================================================
// 7. LOGIN SCREEN COMPONENT
// =================================================================================
const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
    </svg>
);

const EyeOffIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 12.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
        <path fillRule="evenodd" d="M2 10s3-5.5 8-5.5 8 5.5 8 5.5-3 5.5-8 5.5-8-5.5-8-5.5zM10 14a4 4 0 100-8 4 4 0 000 8z" clipRule="evenodd" opacity="0.5"/>
        <path d="M17.707 3.707a1 1 0 00-1.414-1.414L2.293 16.293a1 1 0 101.414 1.414L17.707 3.707z"/>
    </svg>
);

const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const backgroundImageUrl = "https://res.cloudinary.com/dcm5pug0v/image/upload/v1753909863/cdd2c29ae067f10e2b5d03787f7f4c44_v5hp5j.jpg";

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await auth.signInWithEmailAndPassword(email, password);
        } catch (err: any) {
            setError('Credenciales incorrectas. Por favor, inténtalo de nuevo.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
         <div
            className="min-h-screen bg-cover bg-center"
            style={{ backgroundImage: `url(${backgroundImageUrl})` }}
        >
            <div className="min-h-screen flex items-center justify-center p-4 bg-black/50 animate-fade-in">
                <div className="max-w-md w-full bg-stone-200/95 backdrop-blur-sm p-8 rounded-2xl shadow-2xl animate-fade-in-up">
                    <div className="text-center mb-6">
                        <img 
                            src={LOGO_URL} 
                            alt="Logo Inmobiliaria" 
                            className="mx-auto h-40 w-auto mb-2 animate-zoom-in"
                        />
                        <h1 className="text-3xl font-bold text-stone-900">Panel de Administrador</h1>
                        <p className="text-stone-600 mt-2">Inicia sesión para continuar</p>
                    </div>
                    <form onSubmit={handleLogin}>
                        {error && <p className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-center">{error}</p>}
                        <div className="mb-4">
                            <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1">Email</label>
                            <input
                                type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-2 border border-stone-300 rounded-md bg-stone-100/80 text-stone-900 placeholder:text-stone-500 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition"
                                required
                            />
                        </div>
                        <div className="mb-6">
                           <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1">Contraseña</label>
                           <div className="relative">
                               <input
                                   type={showPassword ? 'text' : 'password'}
                                   id="password" value={password} onChange={(e) => setPassword(e.target.value)}
                                   className="w-full px-4 py-2 border border-stone-300 rounded-md bg-stone-100/80 text-stone-900 placeholder:text-stone-500 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition pr-10"
                                   required
                               />
                               <button
                                   type="button"
                                   onClick={() => setShowPassword(!showPassword)}
                                   className="absolute inset-y-0 right-0 flex items-center pr-3"
                                   aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                               >
                                   {showPassword ? <EyeIcon /> : <EyeOffIcon />}
                               </button>
                           </div>
                        </div>
                        <button type="submit" disabled={isLoading} className="w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-emerald-400 transition-colors duration-300">
                            {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};


// =================================================================================
// 8. APP COMPONENT
// =================================================================================
const App = () => {
    const authContext = useAuth();
    return authContext?.user ? <Dashboard /> : <LoginScreen />;
};

// =================================================================================
// 9. RENDER APP
// =================================================================================
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
    <React.StrictMode>
        <AuthProvider>
            <App />
        </AuthProvider>
    </React.StrictMode>
);
