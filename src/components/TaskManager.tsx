import { useState, useEffect } from 'react';
import { supabase } from '../supabase-client';
import { Session } from '@supabase/supabase-js';
// Basically we also need to insert the email so we can only get that
// from the session object of the current user which is passed from Auth component
export const TaskManager = ({session} : {session : Session}) => {
  type Task = {
    id: number;
    title: string;
    description: string;
    created_at: string;
  };

  const [task, setTask] = useState({ title: '', description: '' });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [description, setDescription] = useState('');

  const fetchTasks = async () => {
    const { error, data } = await supabase
      .from('Tasks')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching tasks:', error.message);
      return;
    }
    setTasks(data || []);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    // basically the RLS specifies we need to insert the email of the user aswell 
    // so we append the email of the user to the current task object,we're basically getting the email of the user from the session object
    const { error, data } = await supabase.from('Tasks').insert({...task,email: session.user.email}).select();
    if (error) {
      console.error('Error adding task:', error.message);
      return;
    }
    if (data) {
      setTasks((prevTasks) => [...prevTasks, ...data]); // Add the new task to the state
    }
    setTask({ title: '', description: '' }); // Reset the form
  };

  const updateData = async (id: number) => {
    const { error } = await supabase
      .from('Tasks')
      .update({ description })
      .eq('id', id);

    if (error) {
      console.error('Error updating task:', error.message);
      return;
    }

    // Update the tasks state manually
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === id ? { ...task, description } : task
      )
    );
  };

  const deleteTask = async (id: number) => {
    const { error } = await supabase.from('Tasks').delete().eq('id', id);
    if (error) {
      console.error('Error deleting task:', error.message);
      return;
    }

    // Update the UI by removing the task from the state
    setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id));
  };
  const logout = async () => {
    await supabase.auth.signOut();
    // destroy session
    // basically this will remove the session from the local storage and the user will be logged out
    // and the auth component will be rendered again
    window.location.reload();
  // this will reload the page and the auth component will be rendered again

  }
  return (
    <>
     <button onClick={logout}>Logout</button>
      {/* Task Form */}
      <form
        onSubmit={handleSubmit}
        style={{
          border: '1px solid #ccc',
          padding: '1rem',
          borderRadius: '5px',
          marginBottom: '2rem',
        }}
      >
        <label htmlFor="title">Task Title:</label>
        <input
          type="text"
          id="title"
          name="title"
          onChange={(e) => setTask((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="Enter task title"
          required
          style={{ width: '100%', marginTop: '0.5rem', marginBottom: '1rem', padding: '0.5rem' }}
        />

        <label htmlFor="description">Task Description:</label>
        <textarea
          id="description"
          name="description"
          onChange={(e) => setTask((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Enter task description"
          rows={4}
          required
          style={{ width: '100%', marginTop: '0.5rem', marginBottom: '1rem', padding: '0.5rem' }}
        />

        <button type="submit" style={{ padding: '0.5rem 1rem' }}>
          Add Task
        </button>
      </form>

      {/* Task List */}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {tasks.map((task) => (
          <li
            key={task.id}
            style={{
              border: '1px solid #ddd',
              borderRadius: '5px',
              padding: '1rem',
              marginBottom: '1rem',
            }}
          >
            <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{task.title}</p>
            <p style={{ marginBottom: '1rem' }}>{task.description}</p>
            <textarea
              id="description"
              name="description"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter task description"
              style={{
                width: '100%',
                marginTop: '0.5rem',
                marginBottom: '1rem',
                padding: '0.5rem',
              }}
            />
            <div>
              <button
                onClick={() => updateData(task.id)}
                style={{ marginRight: '0.5rem' }}
              >
                Update
              </button>
              <button onClick={() => deleteTask(task.id)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
};