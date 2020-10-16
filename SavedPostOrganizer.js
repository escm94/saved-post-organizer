const postsPerRequest = 100;
const maxPostsToFetch = 1000;
const maxRequests = maxPostsToFetch / postsPerRequest;

const responses = [];
let folders = [];
let posts = [];
let lastSyncedDate;

const handleSync = e => {        
    folders = [];
    posts = [];
    const newFolder = {
        folderName: 'All',
        savedPosts: [],
        defaultFolder: true
    };
    folders.push(newFolder);
    fetchPosts();
}

window.onload = (event) => {
    folders = [];
    posts = [];
    
    if (localStorage.getItem('folders') != null) {
        folders = JSON.parse(localStorage.getItem('folders'));
    } 

    if (localStorage.getItem('posts') != null) {
        posts = JSON.parse(localStorage.getItem('posts'));
    }

    document.getElementById('lastSyncedVal').innerHTML = localStorage.getItem('lastSynced');
    folders.forEach(displayFolder);
};

const fetchPosts = async (afterParam) => {
    //TODO: obviously refine this
    try {
        document.getElementById('btnSync').classList.add("spin");

        const response = await fetch(`https://www.reddit.com/saved.json?limit=${postsPerRequest}${
            afterParam ? '&after=' + afterParam : ''
        }`); 
    
        const responseJSON = await response.json();
        responses.push(responseJSON);
        responseJSON.data.children.forEach(processPost);

        if (responseJSON.data.after && responses.length < maxRequests) {
            fetchPosts(responseJSON.data.after);
            return;
        }

        let tempDate = new Date(Date.now());
        lastSyncedDate = tempDate.toString().split(" GMT")[0];
        localStorage.setItem('lastSynced', lastSyncedDate);
        posts.forEach(post => folders.find(folder => folder.folderName === 'All').savedPosts.push(post));
        localStorage.setItem('folders', JSON.stringify(folders));
        localStorage.setItem('posts', JSON.stringify(posts));
        displayAll();
        document.getElementById('btnSync').classList.remove("spin");
    } catch (error) {
        document.getElementById('btnSync').classList.remove("spin");
        document.getElementById('lblLastSynced').classList.add('hide');
        document.getElementById('lastSyncedVal').classList.add('hide');
        document.getElementById('lblLogin').classList.remove('hide');
        document.getElementById('lblLogin').classList.add('show');
    }
};

function processPost(savedItem) {
    if (folders.find(folder => folder.folderName === savedItem.data.subreddit_name_prefixed) == null) {
        const newFolder = {
            folderName: savedItem.data.subreddit_name_prefixed,
            savedPosts: [],
            defaultFolder: true
        };
        folders.push(newFolder);
    }

    const savedPost = {
        id: savedItem.data.name
    };

    if (savedItem.data.name.substring(0, 3) === 't1_') {
        savedPost.link = 'https://reddit.com' + savedItem.data.permalink;
        savedPost.title = savedItem.data.link_title;
    }
    else {
        savedPost.link = savedItem.data.url;
        savedPost.title = savedItem.data.title;
    }

    folders.find(folder => folder.folderName === savedItem.data.subreddit_name_prefixed).savedPosts.push(savedPost);

    if (posts.find(post => post.id === savedPost.id) == null) {
        const newPost = {
            id: savedPost.id,
            title: savedPost.title,
            link: savedPost.link
        };
        posts.push(newPost);
    }
}

//TODO: rename
const displayAll = () => {
    document.getElementById('lastSyncedVal').innerHTML = localStorage.getItem('lastSynced');
    folders.forEach(displayFolder);
    displayUncategorizedPosts();
};

//TODO: remove (replace with displayPostsFromFolder and pass in All folder)
function displayUncategorizedPosts(){
    document.getElementById('posts').innerHTML = "<h2>All</h2>";
    posts.forEach(displayPost);
}

function displayFolder(folder) {
    const btnFolder = document.createElement('div');
    btnFolder.className = 'folder';
    btnFolder.id = folder.folderName;
    if (folder.folderName === 'All') {
        btnFolder.innerHTML = "<strong>" + folder.folderName + '(' + folder.savedPosts.length + ')' + "</strong>";
    }
    else {
        btnFolder.innerHTML = folder.folderName + "(" + folder.savedPosts.length + ")";
    }
    btnFolder.addEventListener('click', function(){
        displayPostsFromFolder(btnFolder.id);
    });
    document.getElementById('folders').appendChild(btnFolder);    
}

function displayPostsFromFolder(folderName){
    document.getElementById('posts').innerHTML = "<h2>" + folderName + "</h2>";
    folders.find(folder => folder.folderName === folderName).savedPosts.forEach(displayPost);
}

function displayPost(savedPost){
    const post = document.createElement('div');
    post.className = 'post';
    post.id = savedPost.id;
    document.getElementById('posts').appendChild(post);
    
    const link = document.createElement('a');
    link.href = savedPost.link;

    if (savedPost.id.substring(0, 3) === 't1_') {
        link.innerHTML = '(comment)';
    }    

    link.innerHTML += savedPost.title;
    link.target = '_blank';
    document.getElementById(post.id).appendChild(link);

    document.getElementById('posts').innerHTML += '<hr>';
}

document.getElementById('btnSync').addEventListener('click', handleSync);
