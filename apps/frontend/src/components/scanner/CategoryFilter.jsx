import { useScanStore } from '../../store/scanStore.js';
import { CATEGORY_LIST } from '../../utils/categories.js';

export default function CategoryFilter() {
  const { categories, setCategories } = useScanStore();

  const toggle = (id) => {
    if (categories.includes(id)) {
      setCategories(categories.filter((c) => c !== id));
    } else {
      setCategories([...categories, id]);
    }
  };

  const selectAll = () => setCategories(CATEGORY_LIST.map((c) => c.id));
  const clearAll = () => setCategories([]);

  return (
    <div>
      <div style={styles.header}>
        <label style={styles.label}>Loại địa điểm</label>
        <div style={styles.actions}>
          <button onClick={selectAll} style={styles.btn}>Tất cả</button>
          <button onClick={clearAll} style={styles.btn}>Xóa</button>
        </div>
      </div>
      <div style={styles.list}>
        {CATEGORY_LIST.map((cat) => (
          <label key={cat.id} style={styles.item}>
            <input
              type="checkbox"
              checked={categories.includes(cat.id)}
              onChange={() => toggle(cat.id)}
              style={{ accentColor: cat.color }}
            />
            <span style={{ color: cat.color, marginLeft: 4 }}>{cat.icon}</span>
            <span style={styles.catLabel}>{cat.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

const styles = {
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  label: { color: '#909296', fontSize: 12, fontWeight: 500 },
  actions: { display: 'flex', gap: 6 },
  btn: {
    background: 'none', border: '1px solid #373a40', color: '#909296',
    borderRadius: 4, padding: '2px 7px', fontSize: 10, cursor: 'pointer',
  },
  list: { display: 'flex', flexDirection: 'column', gap: 5 },
  item: { display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' },
  catLabel: { color: '#c1c2c5', fontSize: 12 },
};
