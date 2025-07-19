document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('search-query');
    const searchResults = document.getElementById('search-results');
    let searchIndex = null;

    // Fetch the search index
    fetch('/index.json')
        .then(response => response.json())
        .then(data => {
            searchIndex = data;
        });

    searchInput.addEventListener('keyup', function () {
        const query = this.value.toLowerCase();
        searchResults.innerHTML = '';

        if (query.length < 2 || !searchIndex) {
            return;
        }

        const results = searchIndex.filter(item => {
            return item.title.toLowerCase().includes(query) || item.content.toLowerCase().includes(query);
        });

        if (results.length > 0) {
            results.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = `<a href="${item.uri}">${item.title}</a>`;
                searchResults.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.textContent = 'No results found';
            searchResults.appendChild(li);
        }
    });
});
