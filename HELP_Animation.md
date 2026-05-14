The easiest and most modern approach to achieve a 3D book-opening animation in React is using **Framer Motion**.

While you can do this with pure CSS, Framer Motion handles the 3D perspective and the "hinge" logic much more gracefully with less code.

### The "Secret" to the Animation:
1.  **`transform-origin: left`**: This ensures the cover rotates around the left edge (the spine) rather than the center.
2.  **`perspective`**: A container property that makes the 3D rotation look realistic instead of flat.
3.  **`rotateY`**: The actual animation property.

### Implementation Example

```jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';

const App = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={styles.page}>
      {/* 1. SMALL HEADER */}
      <header style={styles.header}>
        <div style={styles.logo}>👌 Superr</div>
        <button style={styles.btn}>Login</button>
      </header>

      {/* 2. MAIN CONTENT */}
      <main style={styles.main}>
        <div style={styles.textSide}>
          <h1 style={styles.title}>SuperrBook gets what we write.</h1>
          <p style={styles.desc}>It makes our books come alive. It helps us without making us feel dumb.</p>
          <p style={styles.handwriting}>It writes like paper, and feels like a friend. ❤️</p>
        </div>

        {/* 3. THE BOOK CONTAINER */}
        <div 
          style={styles.bookPerspective} 
          onClick={() => setIsOpen(!isOpen)}
        >
          {/* THE INSIDE PAGE (Fixed) */}
          <div style={styles.innerPage}>
            <div style={styles.ruledContent}>
              <h3>This page is yours.</h3>
              <p>Scribble here, sketch something...</p>
              <div style={styles.pencil}></div>
            </div>
          </div>

          {/* THE COVER (Animated) */}
          <motion.div
            initial={false}
            animate={{ rotateY: isOpen ? -110 : 0 }}
            transition={{ type: 'spring', stiffness: 50, damping: 15 }}
            style={styles.cover}
          >
            <div style={styles.label}>
              <div style={styles.labelName}>Param</div>
              <div style={styles.labelMeta}>Class: VIII-A | Roll: 20</div>
            </div>
            <div style={styles.stickers}>⚡ ❤️</div>
            <div style={styles.debossed}>👌</div>
          </motion.div>
        </div>
      </main>

      {/* 4. SMALL FOOTER */}
      <footer style={styles.footer}>
        <p>© 2024 Superr Tech</p>
      </footer>
    </div>
  );
};

const styles = {
  page: { 
    fontFamily: 'sans-serif', 
    height: '100vh', 
    display: 'flex', 
    flexDirection: 'column', 
    backgroundColor: '#fff' 
  },
  header: { 
    padding: '20px 50px', 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    borderBottom: '1px solid #eee' 
  },
  logo: { fontSize: '20px', fontWeight: 'bold' },
  btn: { padding: '8px 16px', borderRadius: '20px', border: '1px solid #000', cursor: 'pointer' },
  main: { 
    flex: 1, 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: '100px', 
    padding: '0 50px' 
  },
  textSide: { maxWidth: '400px' },
  title: { fontSize: '42px', marginBottom: '20px' },
  desc: { fontSize: '18px', color: '#555', lineHeight: '1.5' },
  handwriting: { color: '#e67e22', fontStyle: 'italic', marginTop: '20px' },
  
  // BOOK STYLES
  bookPerspective: {
    width: '300px',
    height: '400px',
    position: 'relative',
    perspective: '1500px', // Crucial for 3D effect
    cursor: 'pointer',
  },
  cover: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: '#A2D2D2', // LIGHT TEAL requested
    borderRadius: '5px 15px 15px 5px',
    borderLeft: '12px solid #81b1b1', // The spine
    transformOrigin: 'left', // Crucial: rotates like a door
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    boxShadow: '10px 10px 20px rgba(0,0,0,0.1)',
    zIndex: 2,
    backfaceVisibility: 'hidden',
  },
  innerPage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: '#f9f9f9',
    borderRadius: '5px 15px 15px 5px',
    boxShadow: 'inset 5px 0 10px rgba(0,0,0,0.05)',
    zIndex: 1,
    padding: '30px',
    border: '1px solid #ddd',
  },
  label: {
    backgroundColor: '#fff',
    width: '70%',
    marginTop: '50px',
    padding: '15px',
    border: '2px solid #444',
    textAlign: 'center',
  },
  labelName: { fontSize: '24px', fontWeight: 'bold', fontFamily: 'serif' },
  labelMeta: { fontSize: '10px', color: '#888', marginTop: '5px' },
  stickers: { position: 'absolute', bottom: '30px', left: '30px', fontSize: '24px' },
  debossed: { position: 'absolute', bottom: '20px', right: '20px', opacity: 0.2 },
  pencil: {
    position: 'absolute',
    right: '-15px',
    top: '20%',
    width: '10px',
    height: '150px',
    backgroundColor: '#ffd32a',
    borderRadius: '5px',
  },
  footer: { 
    textAlign: 'center', 
    padding: '20px', 
    fontSize: '12px', 
    color: '#aaa', 
    borderTop: '1px solid #eee' 
  }
};

export default App;
```

### Why this is the easiest approach:
1.  **Framer Motion (`motion.div`)**: Instead of writing complex CSS keyframes and managing class toggles, you just tell the component: `animate={{ rotateY: isOpen ? -110 : 0 }}`. It handles the smoothing and physics automatically.
2.  **Spring Physics**: The `type: 'spring'` makes the book feel "heavy" and tactile when it opens, just like the GIF.
3.  **No SVG needed**: Everything is built using standard `div` elements with `border-radius` and `box-shadow` for that soft, material look.
4.  **Perspective**: Setting `perspective: 1500px` on the parent container ensures that as the cover rotates, the edge closer to you looks larger than the edge further away, creating the 3D depth.