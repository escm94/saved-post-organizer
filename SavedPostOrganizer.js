const postsPerRequest = 100;
const maxPostsToFetch = 1000;
const maxRequests = maxPostsToFetch / postsPerRequest;

let responses = [];
let folders = [];
let posts = [];

//TODO: figure out how to get the btnPrevious and btnNext event handlers to work with parameters
let currentFolderName;
let currentPageLow;
let currentPageHigh;
let currentTotalPosts;

const handleSync = () => {        
    folders = [];
    posts = [];
    responses = [];

    currentFolderName = '';
    currentPageLow = 0;
    currentPageHigh = 0;
    currentTotalPosts = 0;

    const allFolder = {
        folderName: 'All',
        savedPosts: [],
        defaultFolder: true
    };
    folders.push(allFolder);
    
    fetchPosts();
};

window.onload = () => {
    folders = [];
    posts = [];
    
    if (localStorage.getItem('folders') != null) {
        folders = JSON.parse(localStorage.getItem('folders'));
    } 

    if (localStorage.getItem('posts') != null) {
        posts = JSON.parse(localStorage.getItem('posts'));
    }
    
    folders.forEach(displayFolder);
    configurePrevNextBtns(false, false); 
    currentPageHigh = (posts.length > 25) ? 25 : posts.length;
    displayPostsFromFolder(folders.find(folder => folder.folderName == 'All'));
    document.getElementById('lastSyncedVal').innerHTML = localStorage.getItem('lastSynced');
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
        let lastSyncedDate = tempDate.toString().split(" GMT")[0];

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

const processPost = (savedItem) => {
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

    // post is a comment, so url won't work
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
};

const displayAll = () => {
    currentPageLow = (posts.length < 1) ? 0 : 1;
    currentPageHigh = (posts.length > 25) ? 25 : posts.length;

    document.getElementById('lastSyncedVal').innerHTML = localStorage.getItem('lastSynced');
    document.getElementById('folders').innerHTML = '';

    folders.forEach(displayFolder);
    displayPostsFromFolder(folders.find(folder => folder.folderName == 'All'));
};

const displayFolder = (folder) => {
    const numPosts = folder.savedPosts.length;
    
    const btnFolder = document.createElement('div');
    btnFolder.className = 'folder';
    btnFolder.id = folder.folderName;
    btnFolder.innerHTML = folder.folderName + "(" + numPosts + ")";
    btnFolder.addEventListener('click', function(){        
        currentPageLow = 1;
        currentPageHigh = (numPosts <= 25) ? numPosts : 25;
        configurePrevNextBtns(false, false);        
        displayPostsFromFolder(folder);
    });
    document.getElementById('folders').appendChild(btnFolder);    
};

const displayPostsFromFolder = (folder) => {
    currentFolderName = folder.folderName;
    currentTotalPosts = folder.savedPosts.length;
    currentPageHigh = (currentPageHigh <= currentTotalPosts) ? currentPageHigh : currentTotalPosts;
    
    if (currentTotalPosts < 1) {
        currentPageLow = 0;
    }   
    else if (currentTotalPosts < 25) {
        currentPageLow = 1;
    } 
    else {
        // do we still need this?
        currentPageLow = (currentPageLow == undefined) ? 1 : currentPageLow; 
    }

    let lblFolderName = document.getElementById('lblFolderName');
    lblFolderName.innerHTML = folder.folderName;
    lblFolderName.className = 'show';

    document.getElementById('posts').innerHTML = '';
    let postsOnPage = folder.savedPosts.slice(currentPageLow - 1, currentPageHigh);
    postsOnPage.forEach(displayPost);
    document.getElementById('lblPages').innerHTML = currentPageLow + '-' + currentPageHigh + ' of ' + currentTotalPosts;

    document.getElementById('btnPrevious').disabled = (currentPageLow > 1) ? false : true;
    document.getElementById('btnNext').disabled = (currentPageHigh < currentTotalPosts) ? false : true;
    configurePrevNextBtns(document.getElementById('btnPrevious').disabled, document.getElementById('btnNext').disabled);

    if (document.getElementById('btnPrevious').disabled == false && !document.getElementById('btnPrevious').getAttribute('hasEventHandler')) {
        document.getElementById('btnPrevious').addEventListener('click', btnPreviousOnClick);
    }
    if (document.getElementById('btnNext').disabled == false && !document.getElementById('btnNext').getAttribute('hasEventHandler')) {
        document.getElementById('btnNext').addEventListener('click', btnNextOnClick);
    }
};

const configurePrevNextBtns = (btnPrevDisabled, btnNextDisabled) => {
    let oldPrevDisabled = btnPrevDisabled;
    let oldNextDisabled = btnNextDisabled;

    document.getElementById('btnPrevious').disabled = false;
    document.getElementById('btnNext').disabled = false;

    if (document.getElementById('btnPrevious').getAttribute('hasEventHandler')) {
        document.getElementById('btnPrevious').removeEventListener('click', btnPreviousOnClick);
        document.getElementById('btnPrevious').removeAttribute('hasEventHandler');
    }

    if (document.getElementById('btnNext').getAttribute('hasEventHandler')) {
        document.getElementById('btnNext').removeEventListener('click', btnNextOnClick);
        document.getElementById('btnNext').removeAttribute('hasEventHandler');
    }

    document.getElementById('btnPrevious').disabled = oldPrevDisabled;
    document.getElementById('btnNext').disabled = oldNextDisabled;
};

const btnPreviousOnClick = () => {
    currentPageHigh = (currentPageHigh == currentTotalPosts) ? currentPageLow - 1 : currentPageHigh - 25;
    currentPageLow = currentPageLow - 25;
    document.getElementById('btnPrevious').setAttribute('hasEventHandler', 'true');
    displayPostsFromFolder(folders.find(folder => folder.folderName == currentFolderName));
};

const btnNextOnClick = () => {
    currentPageLow = currentPageHigh + 1;
    currentPageHigh = currentPageHigh + 25;
    document.getElementById('btnNext').setAttribute('hasEventHandler', 'true');
    displayPostsFromFolder(folders.find(folder => folder.folderName == currentFolderName));
};

const displayPost = (savedPost) => {
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
};

document.getElementById('btnSync').addEventListener('click', handleSync);
