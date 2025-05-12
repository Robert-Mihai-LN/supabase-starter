import { useState, useEffect, ChangeEvent } from 'react';
import { supabase } from '../supabase-client';
import { Session } from '@supabase/supabase-js';
// Basically we also need to insert the email so we can only get that
// from the session object of the current user which is passed from Auth component
export const TaskManager = ({session} : {session : Session}) => {
  type Task = {
    image_url: string | undefined;
    id: number;
    title: string;
    description: string;
    created_at: string;
  };
  const [myImage, setMyImage] = useState<File | null>(null);
  const [task, setTask] = useState({ title: '', description: '' });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [description, setDescription] = useState('');
  const uploadImage = async (file: File ): Promise<string | null> => {
    const imageName = `${Date.now()}-${file.name}`;
    // upload the image to the storage bucket
    const { error } = await supabase.storage
      .from('task-images')
      .upload(imageName, file);
      if (error) {
        console.error("Error uploading image:", error.message);
        return null;
      }
      // grab the url of the file from storage bucket
      const {data} = supabase
      .storage
      .from('task-images')
      .getPublicUrl(
        imageName
      );

    return data.publicUrl; // Return the public URL of the uploaded image
  }

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
  useEffect(() => { 
   // basically now that there are RLS to the tasks and there are policies set in
   // place so only people with X email can update and delete tasks  we want 
   // to notify people who are subscribed to a certain channel on the changes for 
   // this specific tasks table 
   const tasksChannel = supabase.channel('tasks_channel');
   tasksChannel.on('postgres_changes',{event:'INSERT',schema:'public',table:'Tasks'},(payload)=> {
    // basically this will listen to inserts on the Tasks table and the function will be used to 
    // retrieve the payload 
    const newTask = payload.new as Task; // this is like trigger.new
    setTasks((prevTasks) => [...prevTasks, newTask]);
    }).subscribe((status) => { 
        // basically this subscribe function will be used to tell us the status of the 
        // channel subscription and if it is connected or not
        console.log('Channel status:', status);
    })
   // basically this is like a trigger which will help us get the new records that were inserted
   
   
  },[])
  const handleFileChange = async (e:ChangeEvent<HTMLInputElement>) => {
    if(e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setMyImage(file);
    }
  }
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    let imageUrl: string | null = null;
    if(myImage){
        // basically this will be used to upload the current image from input
        // to the storage bucket in supabase 
        imageUrl = await uploadImage(myImage); 
    }
    // basically the RLS specifies we need to insert the email of the user aswell 
    // so we append the email of the user to the current task object,we're basically getting the email of the user from the session object
    const { error, data } = await supabase
     .from('Tasks')
     .insert({...task,email: session.user.email,image_url:imageUrl})
     .select();

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
        <input type="file" accept="image/*" onChange={handleFileChange}/> 
        <button type="submit" style={{ padding: '0.5rem 1rem' }}>
          Add Task
        </button>
      </form>

      {/* Task List */}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {tasks.map((task,index) => (
          <li
          key={`${task.id}-${index}`}
            style={{
              border: '1px solid #ddd',
              borderRadius: '5px',
              padding: '1rem',
              marginBottom: '1rem',
            }}
          >
            <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{task.title}</p>
            <p style={{ marginBottom: '1rem' }}>{task.description}</p>
            <img src={task.image_url} alt="Task" style={{ width: '100%', height: 'auto', marginBottom: '1rem' }} />
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