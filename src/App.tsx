import { useEffect, useState } from 'react';
import './App.css';
import { Auth } from './components/auth';
import { TaskManager } from './components/taskManager';
import { supabase } from './supabase-client';

function App() {
  const [session,setSession] = useState<any>(null);
  const fetchSession = async () => {
    // destructure the data from the session object
    const mySession = await supabase.auth.getSession();
    setSession(mySession.data.session);
  }
  const updateSessionStatus = async() => { 
    // listen for changes in the auth state and update the session
   const {data: authListener} =  supabase.auth.onAuthStateChange((event,session) => {
        setSession(session)
         
    })
    // this is to clean up the space taken by this listener 
    // basically this listener will be removed when the component is unmounted
    // and it was used to listen for changes in the auth state
    return () => { authListener.subscription.unsubscribe(); }
  }
  // This will basically run the session check when the app loads
  useEffect(() => {
    fetchSession();
    updateSessionStatus();
  }, []);
  const logout = async () => {
    await supabase.auth.signOut();
    // destroy session
    setSession(null);
  }

  return (
    <>
      <div style={{ maxWidth: '600px', margin: '2rem auto', fontFamily: 'Arial, sans-serif' }}>
        {  session ? (<TaskManager session={session}/>) : (<Auth />) }
      </div>
    </>
  );
}

export default App;