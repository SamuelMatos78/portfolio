import { SceneProvider } from "./runtime/SceneContext";
import SceneManager from "./runtime/SceneManager";
import "./App.css";
import LocaleProvider from "./i18n/LocaleProvider";

export default function App() {
  return <LocaleProvider><SceneProvider><SceneManager /></SceneProvider></LocaleProvider>;
}
