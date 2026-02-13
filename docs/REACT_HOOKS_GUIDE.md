# React Hooks: Complete Guide

## What Are React Hooks?

React Hooks are functions that let you use state and other React features in functional components. Introduced in React 16.8, they allow you to "hook into" React state and lifecycle features without writing class components.

---

## Core Concept Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    FUNCTIONAL COMPONENT                         │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    useState()                             │  │
│  │  ┌─────────┐      ┌─────────┐                             │  │
│  │  │ state   │ ◄──► │ setter  │                             │  │
│  │  │ value   │      │ fn      │                             │  │
│  │  └─────────┘      └─────────┘                             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    useEffect()                            │  │
│  │                                                           │  │
│  │   ┌──────────┐    ┌──────────┐    ┌──────────┐          │  │
│  │   │ Mount    │───►│ Update   │───►│ Unmount  │          │  │
│  │   │ () => {} │    │ () => {} │    │ return() │          │  │
│  │   └──────────┘    └──────────┘    └──────────┘          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                 Other Hooks                                │  │
│  │  useContext | useCallback | useMemo | useRef | etc.       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## The Rules of Hooks

```
┌─────────────────────────────────────────────────────────────┐
│                     RULES OF HOOKS                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. ONLY CALL HOOKS AT THE TOP LEVEL                       │
│     ❌ Don't call inside loops, conditions, or nested fns  │
│     ✅ Always call at the top of your component             │
│                                                             │
│     ┌─────────────────────────────────────────────────┐     │
│     │  ❌ WRONG                                      │     │
│     │  if (count > 0) {                             │     │
│     │    const [value, setValue] = useState(0)      │     │
│     │  }                                            │     │
│     └─────────────────────────────────────────────────┘     │
│                                                             │
│     ┌─────────────────────────────────────────────────┐     │
│     │  ✅ CORRECT                                   │     │
│     │  const [value, setValue] = useState(0)        │     │
│     │  if (count > 0) {                             │     │
│     │    // use value here                          │     │
│     │  }                                            │     │
│     └─────────────────────────────────────────────────┘     │
│                                                             │
│  2. ONLY CALL HOOKS FROM REACT FUNCTIONS                    │
│     ❌ Don't call from regular JavaScript functions         │
│     ✅ Call from React function components or custom hooks │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Built-in Hooks Explained

### 1. useState - Managing Local State

```
┌─────────────────────────────────────────────────────────────────┐
│                         useState()                              │
│                                                                 │
│  INITIAL RENDER                    SUBSEQUENT RENDERS           │
│                                                                 │
│  ┌─────────────────┐               ┌─────────────────┐          │
│  │  useState(0)    │               │  [count, set    │
│  │       │         │               │   Count] =      │
│  │       ▼         │               │   useState(0)   │
│  │  ┌──────┐       │               │       │         │
│  │  │ 0    │       │               │       ▼         │
│  │  └──────┘       │               │  ┌──────┐        │
│  │       │         │               │  │ 0    │  ◄─────┼── User sees
│  │       │         │               │  └──────┘        │   this value
│  │       ▼         │               │       │         │
│  │  setCount(1) ───┼───────────────►│  1    │  ◄─────┼── State updated
│  │                 │               │  (in   memory)   │
│  └─────────────────┘               └─────────────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Example:**

```javascript
function Counter() {
  const [count, setCount] = useState(0);

  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;
}
```

### 2. useEffect - Side Effects & Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                         useEffect()                              │
│                                                                 │
│  COMPONENT LIFECYCLE                                            │
│                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐ │
│  │  Mount   │───►│  Update  │───►│  Update  │───►│ Unmount  │ │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘ │
│       │               │               │               │        │
│       ▼               ▼               ▼               ▼        │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                    useEffect(() => {                     │ │
│  │                      // Code runs on mount & updates      │ │
│  │                                                            │ │
│  │                      return () => {                       │ │
│  │                        // Cleanup runs on unmount         │ │
│  │                      };                                   │ │
│  │                    }, [dependency]);                     │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  DEPENDENCY ARRAY EFFECTS:                                      │
│                                                                 │
│  ┌──────────────────┬───────────────────────────────────────┐ │
│  │  []             │ Run ONLY on mount & unmount            │ │
│  │  [a, b]         │ Run when a or b changes               │ │
│  │  (nothing)      │ Run on EVERY render                   │ │
│  └──────────────────┴───────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Example:**

```javascript
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Fetch user data
    fetch(`/api/users/${userId}`)
      .then((res) => res.json())
      .then((data) => setUser(data));

    // Cleanup - cancel any pending requests
    return () => {
      // Cleanup code here
    };
  }, [userId]); // Only re-run if userId changes

  if (!user) return <Loading />;
  return <div>{user.name}</div>;
}
```

### 3. useCallback - Memoized Functions

```
┌─────────────────────────────────────────────────────────────────┐
│                      useCallback()                              │
│                                                                 │
│  WITHOUT useCallback:            WITH useCallback:              │
│                                                                 │
│  Every render:                   Dependency unchanged:          │
│  ┌─────────────┐                ┌─────────────┐                 │
│  │ fn created  │                │ fn cached  │                 │
│  │ ▼           │                │ ▼          │                 │
│  │ Child       │                │ Child      │                 │
│  │ re-renders  │                │ no render  │                 │
│  └─────────────┘                └─────────────┘                 │
│                                                                 │
│  Dependency changed:             Dependency changed:             │
│  ┌─────────────┐                ┌─────────────┐                 │
│  │ fn created  │                │ fn created  │                 │
│  │ ▼           │                │ ▼           │                 │
│  │ Child       │                │ Child       │                 │
│  │ re-renders  │                │ re-renders  │                 │
│  └─────────────┘                └─────────────┘                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Example:**

```javascript
function SearchList({ items, filter }) {
  // This function is memoized and won't be recreated on every render
  const filteredItems = useCallback(() => {
    return items.filter((item) => item.name.toLowerCase().includes(filter.toLowerCase()));
  }, [items, filter]);

  return <List items={filteredItems()} />;
}
```

### 4. useMemo - Memoized Values

```
┌─────────────────────────────────────────────────────────────────┐
│                       useMemo()                                 │
│                                                                 │
│  EXPENSIVE CALCULATION:                                         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  const expensiveResult = useMemo(() => {              │   │
│  │    return items.reduce((sum, item) => sum + item.val, │   │
│  │  0);                                                   │   │
│  │  }, [items]);  // Only recalculate when items changes │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  WITHOUT useMemo:         │  WITH useMemo:                      │
│  Every render:            │  Items unchanged:                   │
│  - Recalculate            │  - Return cached value              │
│  - Expensive              │  - Fast                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5. useRef - Persistent References

```
┌─────────────────────────────────────────────────────────────────┐
│                        useRef()                                │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  const inputRef = useRef(null);                        │   │
│  │                                                         │   │
│  │  <input ref={inputRef} />                              │   │
│  │              │                                         │   │
│  │              │ (after mount)                           │   │
│  │              ▼                                         │   │
│  │  inputRef.current = <input DOM element>               │   │
│  │                                                         │   │
│  │  // Access: inputRef.current.focus()                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  KEY POINTS:                                                    │
│  • Changing ref.current doesn't trigger re-render             │
│  • Persists across renders                                     │
│  • Perfect for DOM access, timers, keeping mutable values      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Custom Hooks - Extracting Component Logic

```
┌─────────────────────────────────────────────────────────────────┐
│                    CUSTOM HOOK PATTERN                          │
│                                                                 │
│  COMPONENT WITH DUPLICATED LOGIC        EXTRACTED CUSTOM HOOK   │
│                                                                 │
│  ┌─────────────────────────┐           ┌─────────────────────┐ │
│  │ function Chat1() {     │           │ function           │ │
│  │   const [msg, setMsg]  │           │ useChat(roomId) {  │ │
│  │     = useState([]);    │           │   const [msg,      │ │
│  │                       │           │     setMsg] =      │ │
│  │   useEffect(() => {   │           │     useState([]);  │ │
│  │     const sub =        │           │                    │ │
│  │       subscribe(...)  │    ==>     │   useEffect(() =>  │ │
│  │     return () =>       │           │     const sub =    │ │
│  │       unsubscribe(...) │           │       subscribe()  │ │
│  │   }, []);              │           │     return () =>   │ │
│  │                       │           │       unsubscribe() │ │
│  │   return <Chat .../>  │           │   }, [roomId]);    │ │
│  │ }                     │           │                    │ │
│  └─────────────────────────┘           │   return [msg,    │ │
│                                       │     setMsg];      │ │
│  ┌─────────────────────────┐           │ }                 │ │
│  │ function Chat2() {     │           └─────────────────────┘ │
│  │   const [msg, setMsg]  │                 │                 │
│  │     = useState([]);    │                 │                 │
│  │                       │                 │                 │
│  │   useEffect(() => {   │                 │                 │
│  │     const sub =        │                 │                 │
│  │       subscribe(...)  │                 │                 │
│  │     return () =>       │                 │                 │
│  │       unsubscribe(...) │                 │                 │
│  │   }, []);              │                 │                 │
│  │                       │                 │                 │
│  │   return <Chat .../>  │                 │                 │
│  │ }                     │                 │                 │
│  └─────────────────────────┘                 │                 │
│                                              ▼                 │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  function Chat1() {          function Chat2() {       │ │
│  │    const [msg, setMsg] = useChat("room1");            │ │
│  │    return <Chat messages={msg} />;                     │ │
│  │  }                         const [msg, setMsg] = useChat("room2"); │
│  │                            return <Chat messages={msg} />;         │
│  │                          }                                         │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Hook Composition in a Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│              DASHBOARD COMPONENT COMPOSITION                     │
│                                                                 │
│                    ┌─────────────────┐                          │
│                    │  DashboardPage  │                          │
│                    └────────┬────────┘                          │
│                             │                                    │
│         ┌───────────────────┼───────────────────┐              │
│         │                   │                   │              │
│         ▼                   ▼                   ▼              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐         │
│  │ useAuth()    │   │ useCallManager│  │ useRecordings│         │
│  │              │   │              │   │              │         │
│  │ Returns:     │   │ Returns:     │   │ Returns:     │         │
│  │ - user       │   │ - callStatus │   │ - recordings│         │
│  │ - token      │   │ - makeCall() │   │ - fetch()   │         │
│  │ - loading    │   │ - hangup()   │   │ - isLoading │         │
│  └──────────────┘   └──────────────┘   └──────────────┘         │
│         │                   │                   │              │
│         └───────────────────┴───────────────────┘              │
│                             │                                    │
│                             ▼                                    │
│                    ┌─────────────────┐                          │
│                    │   Renders UI    │                          │
│                    │  Using State    │                          │
│                    │  From Hooks     │                          │
│                    └─────────────────┘                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Hooks vs Class Lifecycle Comparison

```
┌────────────────────┬────────────────────────────────────────────┐
│                    │                                            │
│   CLASS COMPONENT  │    FUNCTIONAL COMPONENT + HOOKS           │
│                    │                                            │
│  ┌────────────────┴────────────────┐                           │
│  │ constructor()                  │                           │
│  │   this.state = { ... }         │   const [state, setState] │
│  └─────────────────────────────────┘          = useState()      │
│                    │                                            │
│  ┌────────────────┴────────────────┐                           │
│  │ componentDidMount()             │                           │
│  │   // setup subscriptions        │   useEffect(() => {       │
│  │                                 │     // setup              │
│  │                                 │   }, [])                 │
│  └─────────────────────────────────┘                           │
│                    │                                            │
│  ┌────────────────┴────────────────┐                           │
│  │ componentDidUpdate(prevProps)   │                           │
│  │   if (props.id !== prevProps.id)│   useEffect(() => {       │
│  │     // fetch data               │     // fetch data         │
│  │                                 │   }, [props.id])          │
│  └─────────────────────────────────┘                           │
│                    │                                            │
│  ┌────────────────┴────────────────┐                           │
│  │ componentWillUnmount()         │   useEffect(() => {       │
│  │   // cleanup                   │     return () => {         │
│  │                                 │       // cleanup          │
│  │                                 │     }                     │
│  │                                 │   }, [])                 │
│  └─────────────────────────────────┘                           │
│                    │                                            │
│  ┌────────────────┴────────────────┐                           │
│  │ render()                        │   return (...)             │
│  │   return JSX                   │                           │
│  └─────────────────────────────────┘                           │
│                    │                                            │
└────────────────────┴────────────────────────────────────────────┘
```

---

## Summary Table

| Hook          | Purpose           | When to Use                                  |
| ------------- | ----------------- | -------------------------------------------- |
| `useState`    | Local state       | Any component-local data                     |
| `useEffect`   | Side effects      | Fetching, subscriptions, DOM manipulation    |
| `useCallback` | Memoize functions | Passing callbacks to optimized children      |
| `useMemo`     | Memoize values    | Expensive calculations                       |
| `useRef`      | Mutable reference | DOM access, keeping values without re-render |
| `useContext`  | Access context    | Consuming React context                      |
| `useReducer`  | Complex state     | When state logic is complex                  |
| `useCustom`   | Your own hooks    | Extracting reusable logic                    |

---

Would you like me to create the actual hooks documentation file in your project, or shall we continue with the dashboard refactoring plan?
