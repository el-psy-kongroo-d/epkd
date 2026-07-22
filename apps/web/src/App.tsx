import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Archive } from "./pages/Archive";
import { Home } from "./pages/Home";
import { NotFound } from "./pages/NotFound";
import { Post } from "./pages/Post";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="archive" element={<Archive />} />
        <Route path="posts/:slug" element={<Post />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
