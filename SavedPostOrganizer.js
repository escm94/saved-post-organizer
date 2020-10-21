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

    let pageHigh = (posts.length > 25) ? 25 : posts.length;
    document.getElementById('lastSyncedVal').innerHTML = localStorage.getItem('lastSynced');
    folders.forEach(displayFolder);
    displayPostsFromFolder('All', pageHigh);
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
    let pageHigh = (posts.length > 25) ? 25 : posts.length;
    document.getElementById('lastSyncedVal').innerHTML = localStorage.getItem('lastSynced');
    folders.forEach(displayFolder);
    displayPostsFromFolder('All', pageHigh);
};

function displayFolder(folder) {
    const btnFolder = document.createElement('div');
    const numPosts = folders.find(flder => flder.folderName === folder.folderName).savedPosts.length;
    const pageHigh = (numPosts < 25) ? numPosts : 25;

    btnFolder.className = 'folder';
    btnFolder.id = folder.folderName;

    if (folder.folderName === 'All') {
        btnFolder.innerHTML = "<strong>" + folder.folderName + '(' + folder.savedPosts.length + ')' + "</strong>";
    }
    else {
        btnFolder.innerHTML = folder.folderName + "(" + folder.savedPosts.length + ")";
    }
    btnFolder.addEventListener('click', function(){
        displayPostsFromFolder(btnFolder.id, pageHigh);
    });
    document.getElementById('folders').appendChild(btnFolder);    
}

function displayPostsFromFolder(folderName, pageHigh){
    let totalPosts = folders.find(folder => folder.folderName === folderName).savedPosts.length;
    let pageLow = (totalPosts < 25) ? 1 : pageHigh - 24;
    pageHigh = (pageHigh <= totalPosts) ? pageHigh : totalPosts;
    
    document.getElementById('lblPageLow').innerHTML = pageLow + '-';
    document.getElementById('lblPageHigh').innerHTML = pageHigh + ' of ';
    document.getElementById('lblTotalPosts').innerHTML = totalPosts;
    document.getElementById('lblFolderName').innerHTML = folderName;
    lblFolderName.className = 'show';
    document.getElementById('posts').innerHTML = '';
    
    let postsOnPage = folders.find(flder => flder.folderName === folderName).savedPosts.slice(pageLow - 1, pageHigh);
    postsOnPage.forEach(displayPost);
    
    document.getElementById('btnPrevious').disabled = (pageLow > 1) ? false : true;
    document.getElementById('btnNext').disabled = (pageHigh < totalPosts) ? false : true;

    document.getElementById('btnPrevious').addEventListener('click', function(){
        pageHigh = (pageHigh == totalPosts) ? pageLow - 1 : pageHigh - 25;
        displayPostsFromFolder(folderName, pageHigh);
    });
    document.getElementById('btnNext').addEventListener('click', function(){
        pageHigh = pageHigh + 25;
        displayPostsFromFolder(folderName, pageHigh);
    });
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

let btnPrevious = document.createElement('input');
btnPrevious.id = 'btnPrevious';
btnPrevious.type = 'image';
btnPrevious.src = 'images\\icons8-chevron-left-26.png';
btnPrevious.height = 15;
btnPrevious.height = 15;
btnPrevious.disabled = true;

let btnNext = document.createElement('input');
btnNext.id = 'btnNext';
btnNext.type = 'image';
btnNext.src = 'images\\icons8-chevron-right-26.png'
btnNext.height = 15;
btnNext.height = 15;
btnNext.disabled = true;

let lblFolderName = document.createElement('h2');
lblFolderName.id = 'lblFolderName';
lblFolderName.className = 'hide';

let lblPageLow = document.createElement('label');
lblPageLow.id = 'lblPageLow';

let lblPageHigh = document.createElement('label');
lblPageHigh.id = 'lblPageHigh';

let lblTotalPosts = document.createElement('label');
lblTotalPosts.id = 'lblTotalPosts';

document.getElementById('postsHeader').appendChild(lblFolderName);
document.getElementById('postsHeader').appendChild(lblPageLow);
document.getElementById('postsHeader').appendChild(lblPageHigh);
document.getElementById('postsHeader').appendChild(lblTotalPosts);
document.getElementById('postsHeader').appendChild(btnPrevious);
document.getElementById('postsHeader').appendChild(btnNext);
