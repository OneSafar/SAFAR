import React from 'react';

const GlobalPageFooter = () => {
    return (
        <footer className="bg-midnight px-4 md:px-12 py-8 border-t border-slate-800/50">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">

                {/* Write to us Section */}
                <div className="text-center md:text-left">
                    <h4 className="text-white font-semibold mb-2 text-sm">Write to us</h4>
                    <a href="mailto:safarparmar0@gmail.com" className="text-brand-accent hover:text-brand-accent/80 transition-colors text-sm">
                        safarparmar0@gmail.com
                    </a>
                </div>

                <p className="text-slate-600 text-xs">© 2026 Safar</p>
            </div>
        </footer>
    );
};

export default GlobalPageFooter;
