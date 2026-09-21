export default function Card({ children, className = "" }) {
    return (
        <div className={`surface p-5 rounded-2xl ${className}`}>
            {children}
        </div>
    );
}