import React from 'react';
export default function ProgressBar({ used, total }) {
  const percentage = total > 0 ? (used / total) * 100 : 0;
  return (
    <div style={styles.container}>
      <div style={styles.track}>
        <div style={{ ...styles.bar, width: `${percentage}%` }}></div>
      </div>
    </div>
  );
}
const styles = {
  container: { width: '100%', margin: '15px 0' },
  track: { width: '100%', height: '10px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' },
  bar: { height: '100%', backgroundColor: 'var(--primary)', borderRadius: '999px', transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }
};